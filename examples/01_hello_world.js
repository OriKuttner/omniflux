// .omniflux_cache/examples/01_hello_world.js
var fs = require("fs");
var util = require("util");
global.args = process.argv.slice(2);
function sprintf(format, ...args) {
  if (typeof format !== "string") {
    return util.format(format, ...args);
  }
  let argIndex = 0;
  const hasSpecifiers = /%([+-]?)(0?\d*)(?:\.(\d+))?([asdijf%])/g.test(format);
  if (!hasSpecifiers) {
    return util.format(format, ...args);
  }
  let formatted = format.replace(/%(?<flags>[+-]?)(?<width>0?\d*)(?:\.(?<precision>\d+))?(?<type>[asdijf%])/g, (match, flags, widthStr, precisionStr, type) => {
    if (type === "%") return "%";
    if (argIndex >= args.length) return match;
    const val = args[argIndex++];
    let padChar = " ";
    let width = 0;
    let leftAlign = flags === "-";
    if (widthStr) {
      if (widthStr.startsWith("0")) {
        padChar = "0";
        width = parseInt(widthStr, 10);
      } else {
        width = parseInt(widthStr, 10);
      }
    }
    let precision = precisionStr ? parseInt(precisionStr, 10) : -1;
    let result = "";
    if (type === "d" || type === "i") {
      let intVal = parseInt(val, 10);
      if (isNaN(intVal)) intVal = 0;
      result = intVal.toString();
      if (precision >= 0) {
        result = result.padStart(precision, "0");
      }
    } else if (type === "f") {
      let floatVal = parseFloat(val);
      if (isNaN(floatVal)) floatVal = 0;
      if (precision >= 0) {
        result = floatVal.toFixed(precision);
      } else {
        result = floatVal.toString();
      }
    } else if (type === "s") {
      result = String(val);
      if (precision >= 0) {
        result = result.slice(0, precision);
      }
    } else if (type === "j") {
      result = JSON.stringify(val);
    } else {
      result = String(val);
    }
    if (result.length < width) {
      const padLen = width - result.length;
      const padding = padChar.repeat(padLen);
      result = leftAlign ? result + padding : padding + result;
    }
    return result;
  });
  if (argIndex < args.length) {
    const leftover = args.slice(argIndex).map((x) => typeof x === "object" ? util.inspect(x) : String(x));
    formatted += " " + leftover.join(" ");
  }
  return formatted;
}
function print(format, ...args) {
  console.log(sprintf(format, ...args));
}
function printf(format, ...args) {
  process.stdout.write(sprintf(format, ...args));
}
function input(promptMessage) {
  if (promptMessage !== void 0) {
    process.stdout.write(String(promptMessage));
  }
  const buffer = Buffer.alloc(65536);
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(0, buffer, 0, 65536, null);
  } catch (e) {
    return "";
  }
  return buffer.toString("utf8", 0, bytesRead).replace(/\r?\n$/, "");
}
function readchar() {
  const hasRaw = typeof process.stdin.setRawMode === "function";
  const isRaw = process.stdin.isRaw;
  if (hasRaw) {
    process.stdin.setRawMode(true);
  }
  const buffer = Buffer.alloc(1);
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(0, buffer, 0, 1, null);
  } catch (e) {
  } finally {
    if (hasRaw) {
      process.stdin.setRawMode(isRaw);
    }
  }
  const char = buffer.toString("utf8", 0, bytesRead);
  if (char === "") {
    process.exit(130);
  }
  return char;
}
function fileread(path) {
  return fs.readFileSync(path, "utf8");
}
function filewrite(path, data) {
  fs.writeFileSync(path, typeof data === "object" ? JSON.stringify(data, null, 2) : data, "utf8");
}
function fileexists(path) {
  return fs.existsSync(path);
}
function filecopy(src, dest) {
  fs.copyFileSync(src, dest);
}
function filerename(src, dest) {
  fs.renameSync(src, dest);
}
function fileappend(path, data) {
  fs.appendFileSync(path, typeof data === "object" ? JSON.stringify(data, null, 2) : data, "utf8");
}
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
var mysqlModule = null;
var dbPool = null;
async function dbquery(query, params) {
  if (!mysqlModule) {
    mysqlModule = require("mysql2/promise");
  }
  if (!dbPool) {
    const host = process.env.DB_HOST || "localhost";
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME;
    dbPool = mysqlModule.createPool({ host, user, password, database });
  }
  const [rows] = await dbPool.execute(query, params);
  return rows;
}
var redisModule = null;
var redisClient = null;
async function getRedisClient() {
  if (!redisModule) {
    redisModule = require("redis");
  }
  if (!redisClient) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = redisModule.createClient({ url });
    await redisClient.connect();
  }
  return redisClient;
}
async function cacheset(key, val, ttl) {
  const client = await getRedisClient();
  const stringVal = typeof val === "object" ? JSON.stringify(val) : String(val);
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
  } catch (e) {
    return val;
  }
}
function len(val) {
  if (val === null || val === void 0) return 0;
  return val.length || 0;
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
  return "";
}
function arrayslice(arr, start, end) {
  if (Array.isArray(arr)) {
    return arr.slice(start, end);
  }
  return [];
}
function time() {
  return Math.floor(Date.now() / 1e3);
}
function dateyear(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getFullYear();
}
function datemonth(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getMonth() + 1;
}
function dateday(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getDate();
}
function datehour(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getHours();
}
function dateminute(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getMinutes();
}
function datesecond(ts) {
  const d = ts ? new Date(ts * 1e3) : /* @__PURE__ */ new Date();
  return d.getSeconds();
}
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
var APP_NAME = "OmniFlux Demo";
visitor_count = 0;
async function greet(name) {
  visitor_count = visitor_count + 1;
  print("Hello, %s! You are visitor number %d.", name, visitor_count);
}
async function __on_start() {
  printf("Initializing %s...", APP_NAME);
  printf(" Done!\n");
  await greet("Alice");
  await greet("Bob");
  await greet("Charlie");
}
global.greet = greet;
__on_start().catch(console.error);
