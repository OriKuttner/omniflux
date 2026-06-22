// .omniflux_cache/examples/04_ambiguous.js
function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%([0-9.]+)?([dfis])/g, (match, width, type) => {
    let val = args[i++];
    if (val === void 0) return match;
    if (type === "d") {
      let num = parseInt(val, 10);
      if (width) {
        let padChar = width.startsWith("0") ? "0" : " ";
        let len = parseInt(width, 10);
        return String(num).padStart(len, padChar);
      }
      return String(num);
    }
    if (type === "f") {
      let num = parseFloat(val);
      if (width && width.startsWith(".")) {
        let precision = parseInt(width.substring(1), 10);
        return num.toFixed(precision);
      }
      return String(num);
    }
    return String(val);
  });
}
function print(...args) {
  if (args.length > 0 && typeof args[0] === "string" && args[0].includes("%") && args.length > 1) {
    console.log(sprintf(...args));
  } else {
    console.log(...args);
  }
}
function printf(format, ...args) {
  process.stdout.write(sprintf(format, ...args));
}
(async () => {
  var greeting_name = "Alice";
  greeting_name = "Bob";
  const match = "User ID: 9876".match(/\d+/);
  const firstNumber = match ? match[0] : "";
  print(firstNumber);
})();
global.print = print;
global.printf = printf;
