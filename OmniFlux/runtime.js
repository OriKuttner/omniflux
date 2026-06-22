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

function readchar() {
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
function fileread(path) {
    return fs.readFileSync(path, 'utf8');
}

function filewrite(path, data) {
    fs.writeFileSync(path, typeof data === 'object' ? JSON.stringify(data, null, 2) : data, 'utf8');
}

function fileexists(path) {
    return fs.existsSync(path);
}

// OS level atomic operations and helpers
function filecopy(src, dest) {
    fs.copyFileSync(src, dest);
}

function filerename(src, dest) {
    fs.renameSync(src, dest);
}

function fileappend(path, data) {
    fs.appendFileSync(path, typeof data === 'object' ? JSON.stringify(data, null, 2) : data, 'utf8');
}

// safe unlinkSync wrapper
function filedelete(path) {
    fs.unlinkSync(path);
}

function dirlist(path) {
    return fs.readdirSync(path);
}

function filestat(path) {
    const stats = fs.statSync(path);
    return {
        size: stats.size,
        isdirectory: stats.isDirectory(),
        is_directory: stats.isDirectory(),
        isfile: stats.isFile(),
        is_file: stats.isFile(),
        createdat: stats.birthtimeMs,
        created_at: stats.birthtimeMs,
        modifiedat: stats.mtimeMs,
        modified_at: stats.mtimeMs
    };
}

// --- Databases (Lazy Loaded) ---
let mysqlModule = null;
let dbPool = null;
async function dbquery(query, params) {
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

async function cacheset(key, val, ttl) {
    const client = await getRedisClient();
    const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (ttl) {
        await client.setEx(key, ttl, stringVal);
    } else {
        await client.set(key, stringVal);
    }
}

async function cacheget(key) {
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

function strsplit(str, sep) {
    if (typeof str === 'string') {
        return str.split(sep);
    }
    return [];
}

function match(str, regex) {
    if (str === null || str === undefined) return false;
    let regexObj;
    if (regex instanceof RegExp) {
        regexObj = regex;
    } else if (typeof regex === 'string') {
        const firstChar = regex.charAt(0);
        if (/^[^a-zA-Z0-9\s\\]/.test(firstChar)) {
            const lastDelim = regex.lastIndexOf(firstChar);
            if (lastDelim > 0) {
                const pattern = regex.substring(1, lastDelim);
                const flags = regex.substring(lastDelim + 1);
                regexObj = new RegExp(pattern, flags);
            } else {
                regexObj = new RegExp(regex);
            }
        } else {
            regexObj = new RegExp(regex);
        }
    } else {
        return false;
    }
    const res = String(str).match(regexObj);
    if (!res) return false;
    if (res.length > 1) {
        return res.slice(1);
    }
    return true;
}

function arraypush(arr, item) {
    if (Array.isArray(arr)) {
        arr.push(item);
    }
}

function arraypop(arr) {
    if (Array.isArray(arr)) {
        return arr.pop();
    }
    return null;
}

// OS level atomic operations and helpers
function arraycontains(arr, item) {
    if (Array.isArray(arr)) {
        return arr.includes(item);
    }
    return false;
}

function arrayjoin(arr, sep) {
    if (Array.isArray(arr)) {
        return arr.join(sep);
    }
    return '';
}

function arrayslice(arr, start, end) {
    if (Array.isArray(arr)) {
        return arr.slice(start, end);
    }
    return [];
}

// --- Date & Time ---
function time() {
    return Math.floor(Date.now() / 1000);
}

function dateyear(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getFullYear();
}

function datemonth(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getMonth() + 1;
}

function dateday(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getDate();
}

function datehour(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getHours();
}

function dateminute(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getMinutes();
}

function datesecond(ts) {
    const d = ts ? new Date(ts * 1000) : new Date();
    return d.getSeconds();
}

// --- Template Engine (Angular-style) ---
function template(source, context = {}) {
    if (typeof source !== 'string') return '';
    
    let html = source;
    try {
        // 1. Auto-detect if source is a file path that exists
        if (fs.existsSync(source)) {
            html = fs.readFileSync(source, 'utf8');
        }
        
        // 2. Resolve includes recursively
        let includeDepth = 0;
        const maxIncludeDepth = 10;
        while (/@include\s*\(\s*["'](.*?)["']\s*\)/.test(html) && includeDepth < maxIncludeDepth) {
            html = html.replace(/@include\s*\(\s*["'](.*?)["']\s*\)/g, (match, filepath) => {
                if (!fs.existsSync(filepath)) {
                    throw new Error(`Include file not found: '${filepath}'`);
                }
                return fs.readFileSync(filepath, 'utf8');
            });
            includeDepth++;
        }
        
        // Clean up whitespace between @} and @else / @else if to avoid JS syntax errors
        html = html.replace(/@\}\s*(?=@else)/g, '@}');
        
        // Inject AJAX Form/Link SPA client script if it's a full page
        if (html.includes('</body>')) {
            const clientScript = `
<script>
function _of_exec_scripts(container) {
    const scripts = container.querySelectorAll('script');
    for (let oldScript of scripts) {
        const newScript = document.createElement('script');
        for (let attr of oldScript.attributes) {
            newScript.setAttribute(attr.name, attr.value);
        }
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
    }
}

document.addEventListener('submit', async (e) => {
    const form = e.target;
    const targetSelector = form.getAttribute('of-target');
    if (!targetSelector) return;
    
    e.preventDefault();
    try {
        const response = await fetch(form.action || window.location.href, {
            method: form.method || 'POST',
            body: new URLSearchParams(new FormData(form))
        });
        const htmlResult = await response.text();
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) {
            targetEl.innerHTML = htmlResult;
            _of_exec_scripts(targetEl);
        }
    } catch (err) {
        console.error('OmniFlux Form Submission Error:', err);
    }
});

document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const targetSelector = link.getAttribute('of-target');
    if (!targetSelector) return;
    
    e.preventDefault();
    try {
        const response = await fetch(link.href);
        const htmlResult = await response.text();
        const targetEl = document.querySelector(targetSelector);
        if (targetEl) {
            targetEl.innerHTML = htmlResult;
            _of_exec_scripts(targetEl);
        }
    } catch (err) {
        console.error('OmniFlux Link Navigation Error:', err);
    }
});
</script>
`;
            html = html.replace('</body>', clientScript + '</body>');
        }
        
        // 3. Regex to split HTML by control tags
        const tokenRegex = /(@if\s*\(.*?\)\s*\{|@else\s*if\s*\(.*?\)\s*\{|@else\s*\{|@for\s*\(.*?\)\s*\{|@\})/g;
        const parts = html.split(tokenRegex);
        
        let jsCode = "let _out = '';\n";
        
        for (let part of parts) {
            if (!part) continue;
            
            if (part.startsWith('@if')) {
                const cond = part.match(/@if\s*\((.*?)\)\s*\{/)[1];
                jsCode += `if (${cond}) {\n`;
            } else if (part.startsWith('@else if')) {
                const cond = part.match(/@else\s*if\s*\((.*?)\)\s*\{/)[1];
                jsCode += `} else if (${cond}) {\n`;
            } else if (part.startsWith('@else')) {
                jsCode += `} else {\n`;
            } else if (part.startsWith('@for')) {
                const loopMatch = part.match(/@for\s*\(\s*(?:let|var)?\s*(\w+)\s+of\s+(.*?)\)\s*\{/);
                if (loopMatch) {
                    const item = loopMatch[1];
                    const list = loopMatch[2];
                    jsCode += `for (let ${item} of ${list}) {\n`;
                }
            } else if (part === '@}') {
                jsCode += `}\n`;
            } else {
                // Escape backticks, backslashes, and $ symbols in template literals
                let text = part.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
                // Replace {{ expression }} with ${ expression }
                text = text.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, '${$1}');
                jsCode += `_out += \`${text}\`;\n`;
            }
        }
        
        jsCode += "return _out;";
        
        const keys = ['context', ...Object.keys(context)];
        const values = [context, ...Object.values(context)];
        return new Function(...keys, jsCode)(...values);
    } catch (e) {
        return `<!-- Template Error: ${e.message} -->`;
    }
}

// Bind helper functions to global scope
global.sprintf = sprintf;
global.print = print;
global.printf = printf;
global.input = input;

global.readchar = readchar;
global.read_char = readchar;

global.fileread = fileread;
global.file_read = fileread;

global.filewrite = filewrite;
global.file_write = filewrite;

global.fileexists = fileexists;
global.file_exists = fileexists;

global.fileappend = fileappend;
global.file_append = fileappend;

global.filedelete = filedelete;
global.file_delete = filedelete;

global.filecopy = filecopy;
global.file_copy = filecopy;

global.filerename = filerename;
global.file_rename = filerename;

global.dirlist = dirlist;
global.dir_list = dirlist;

global.filestat = filestat;
global.file_stat = filestat;

global.dbquery = dbquery;
global.db_query = dbquery;

global.cacheset = cacheset;
global.cache_set = cacheset;

global.cacheget = cacheget;
global.cache_get = cacheget;

global.len = len;

global.strsplit = strsplit;
global.str_split = strsplit;

global.match = match;

global.arraypush = arraypush;
global.array_push = arraypush;

global.arraypop = arraypop;
global.array_pop = arraypop;

global.arraycontains = arraycontains;
global.array_contains = arraycontains;

global.arrayjoin = arrayjoin;
global.array_join = arrayjoin;

global.arrayslice = arrayslice;
global.array_slice = arrayslice;

global.time = time;

global.dateyear = dateyear;
global.date_year = dateyear;

global.datemonth = datemonth;
global.date_month = datemonth;

global.dateday = dateday;
global.date_day = dateday;

global.datehour = datehour;
global.date_hour = datehour;

global.dateminute = dateminute;
global.date_minute = dateminute;

global.datesecond = datesecond;
global.date_second = datesecond;

global.template = template;
