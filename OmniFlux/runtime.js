const fs = require('fs');
const util = require('util');

// Initialize global args
global.args = process.argv.slice(2);

// --- Print & Formatting ---
function sprintf(format, ...args) {
    if (typeof format !== 'string') {
        return util.format(format, ...args);
    }
    let argIndex = 0;
    const hasSpecifiers = /%([+-]?)(0?\d*)(?:\.(\d+))?([asdijf%])/g.test(format);
    if (!hasSpecifiers) {
        return util.format(format, ...args);
    }
    let formatted = format.replace(/%(?<flags>[+-]?)(?<width>0?\d*)(?:\.(?<precision>\d+))?(?<type>[asdijf%])/g, (match, flags, widthStr, precisionStr, type) => {
        if (type === '%') return '%';
        if (argIndex >= args.length) return match;
        const val = args[argIndex++];
        let padChar = ' ';
        let width = 0;
        let leftAlign = flags === '-';
        if (widthStr) {
            if (widthStr.startsWith('0')) {
                padChar = '0';
                width = parseInt(widthStr, 10);
            } else {
                width = parseInt(widthStr, 10);
            }
        }
        let precision = precisionStr ? parseInt(precisionStr, 10) : -1;
        let result = '';
        if (type === 'd' || type === 'i') {
            let intVal = parseInt(val, 10);
            if (isNaN(intVal)) intVal = 0;
            result = intVal.toString();
            if (precision >= 0) {
                result = result.padStart(precision, '0');
            }
        } else if (type === 'f') {
            let floatVal = parseFloat(val);
            if (isNaN(floatVal)) floatVal = 0.0;
            if (precision >= 0) {
                result = floatVal.toFixed(precision);
            } else {
                result = floatVal.toString();
            }
        } else if (type === 's') {
            result = String(val);
            if (precision >= 0) {
                result = result.slice(0, precision);
            }
        } else if (type === 'j') {
            result = JSON.stringify(val);
        } else {
            result = String(val);
        }
        if (result.length < width) {
            const padLen = width - result.length;
            const padding = padChar.repeat(padLen);
            result = leftAlign ? (result + padding) : (padding + result);
        }
        return result;
    });
    if (argIndex < args.length) {
        const leftover = args.slice(argIndex).map(x => typeof x === 'object' ? util.inspect(x) : String(x));
        formatted += ' ' + leftover.join(' ');
    }
    return formatted;
}

function print(format, ...args) {
    console.log(sprintf(format, ...args));
}

function printf(format, ...args) {
    process.stdout.write(sprintf(format, ...args));
}

// --- Input & Terminal ---
function input(promptMessage) {
    if (promptMessage !== undefined) {
        process.stdout.write(String(promptMessage));
    }
    const buffer = Buffer.alloc(65536);
    let bytesRead = 0;
    try {
        bytesRead = fs.readSync(0, buffer, 0, 65536, null);
    } catch (e) {
        return '';
    }
    return buffer.toString('utf8', 0, bytesRead).replace(/\r?\n$/, '');
}

function read_char() {
    const hasRaw = typeof process.stdin.setRawMode === 'function';
    const isRaw = process.stdin.isRaw;
    if (hasRaw) {
        process.stdin.setRawMode(true);
    }
    const buffer = Buffer.alloc(1);
    let bytesRead = 0;
    try {
        bytesRead = fs.readSync(0, buffer, 0, 1, null);
    } catch (e) {
        // ignore
    } finally {
        if (hasRaw) {
            process.stdin.setRawMode(isRaw);
        }
    }
    const char = buffer.toString('utf8', 0, bytesRead);
    if (char === '\u0003') { // Ctrl+C
        process.exit(130);
    }
    return char;
}

// --- File System ---
function file_read(path) {
    return fs.readFileSync(path, 'utf8');
}

function file_write(path, data) {
    fs.writeFileSync(path, typeof data === 'object' ? JSON.stringify(data, null, 2) : data, 'utf8');
}

function file_exists(path) {
    return fs.existsSync(path);
}

// OS level atomic operations and helpers
function file_copy(src, dest) {
    fs.copyFileSync(src, dest);
}

function file_rename(src, dest) {
    fs.renameSync(src, dest);
}

function file_append(path, data) {
    fs.appendFileSync(path, typeof data === 'object' ? JSON.stringify(data, null, 2) : data, 'utf8');
}

// safe unlinkSync wrapper
function file_delete(path) {
    fs.unlinkSync(path);
}

function dir_list(path) {
    return fs.readdirSync(path);
}

function file_stat(path) {
    const stats = fs.statSync(path);
    return {
        size: stats.size,
        is_directory: stats.isDirectory(),
        is_file: stats.isFile(),
        created_at: stats.birthtimeMs,
        modified_at: stats.mtimeMs
    };
}

// --- Databases (Lazy Loaded) ---
let mysqlModule = null;
let dbPool = null;
async function db_query(query, params) {
    if (!mysqlModule) {
        mysqlModule = require('mysql2/promise');
    }
    if (!dbPool) {
        const host = process.env.DB_HOST || 'localhost';
        const user = process.env.DB_USER || 'root';
        const password = process.env.DB_PASSWORD || '';
        const database = process.env.DB_NAME;
        dbPool = mysqlModule.createPool({ host, user, password, database });
    }
    const [rows] = await dbPool.execute(query, params);
    return rows;
}

// --- Caching (Lazy Loaded) ---
let redisModule = null;
let redisClient = null;
async function getRedisClient() {
    if (!redisModule) {
        redisModule = require('redis');
    }
    if (!redisClient) {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = redisModule.createClient({ url });
        await redisClient.connect();
    }
    return redisClient;
}

async function cache_set(key, val, ttl) {
    const client = await getRedisClient();
    const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (ttl) {
        await client.setEx(key, ttl, stringVal);
    } else {
        await client.set(key, stringVal);
    }
}

async function cache_get(key) {
    const client = await getRedisClient();
    const val = await client.get(key);
    if (!val) return null;
    try {
        return JSON.parse(val);
    } catch(e) {
        return val;
    }
}

// --- Arrays & Lists ---
function len(val) {
    if (val === null || val === undefined) return 0;
    return val.length || 0;
}

function array_push(arr, item) {
    if (Array.isArray(arr)) {
        arr.push(item);
    }
}

function array_pop(arr) {
    if (Array.isArray(arr)) {
        return arr.pop();
    }
    return null;
}

// OS level atomic operations and helpers
function array_contains(arr, item) {
    if (Array.isArray(arr)) {
        return arr.includes(item);
    }
    return false;
}

function array_join(arr, sep) {
    if (Array.isArray(arr)) {
        return arr.join(sep);
    }
    return '';
}

function array_slice(arr, start, end) {
    if (Array.isArray(arr)) {
        return arr.slice(start, end);
    }
    return [];
}

// --- Date & Time ---
function time() {
    return Math.floor(Date.now() / 1000);
}

function date_year(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getFullYear();
}

function date_month(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getMonth() + 1;
}

function date_day(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getDate();
}

function date_hour(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getHours();
}

function date_minute(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getMinutes();
}

function date_second(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getSeconds();
}

// Bind helper functions to global scope
global.sprintf = sprintf;
global.print = print;
global.printf = printf;
global.input = input;
global.read_char = read_char;
global.file_read = file_read;
global.file_write = file_write;
global.file_exists = file_exists;
global.file_append = file_append;
global.file_delete = file_delete;
global.file_copy = file_copy;
global.file_rename = file_rename;
global.dir_list = dir_list;
global.file_stat = file_stat;
global.db_query = db_query;
global.cache_set = cache_set;
global.cache_get = cache_get;
global.len = len;
global.array_push = array_push;
global.array_pop = array_pop;
global.array_contains = array_contains;
global.array_join = array_join;
global.array_slice = array_slice;
global.time = time;
global.date_year = date_year;
global.date_month = date_month;
global.date_day = date_day;
global.date_hour = date_hour;
global.date_minute = date_minute;
global.date_second = date_second;
