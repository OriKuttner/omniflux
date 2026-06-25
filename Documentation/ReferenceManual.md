# OmniFlux Programming Language Reference Manual 📖

Welcome to the official reference manual for **OmniFlux**, a minimalist, self-healing backend programming language designed to run with zero compile-time friction. 

OmniFlux code compiles directly into optimized, production-ready backend code.

---

## 1. Syntax & Core

### 1.1 Comments 💬
OmniFlux supports multiple comment styles with a clear distinction to give you flexibility:

* **Intent & Documentation Comments (`#`):**
  Comments starting with `#` are used to describe your intent, write explanations, or guide the compiler in building your application. These comments are preserved in the final output.
  ```omniflux
  # Calculate user rating based on history
  ```
* **Temporary & Code Comments (`//` and `/* ... */`):**
  Double-slash comments (`//`) and block comments (`/* ... */`) are used for local draft notes or to temporarily disable code blocks. They are completely ignored and stripped out during compilation.
  ```omniflux
  // var old_score = 0
  ```

  > [!TIP]
  > **Nested block comments are fully supported!** Unlike many other languages, OmniFlux allows you to nest block comments (`/* ... /* ... */ ... */`) to any depth. You can safely comment out large chunks of code that already contain block comments without breaking the build.


### 1.2 Variables
* **Block-scoped variables:** Declared with `var` or `const` to scope variables to their local block.
* **Global variables:** Prefixed with `$` (e.g. `$app_name`). These are globally accessible across all included files.
* **Semicolons:** Semicolons are optional. The compiler automatically inserts them where appropriate in the target output.
* **Type Inspection (`describe`):**
  OmniFlux is dynamically typed. To inspect the type of any variable or expression at runtime, use the `describe` keyword. It returns a string representing the type (e.g., `"string"`, `"number"`, `"boolean"`, `"array"`, `"null"`, `"undefined"`, `"function"`, or `"object"`):
  ```omniflux
  var v = [1, 2, 3]
  var type_name = describe v  # Returns "array"
  ```
  Note that uninitialized and non-existent variables return `"undefined"` under `describe`.

```omniflux
$app_name = "OmniFlux App"  # Global variable
var local_counter = 1      // Block-scoped local variable
```

### 1.3 Tasks (Functions)
Tasks (or functions) in OmniFlux are declared using the `define task` syntax. There are two simple variations:

* **Standard task definition:**
  ```omniflux
  define task calculate(a, b) {
      return a + b
  }
  ```
* **Natural English task definition:**
  ```omniflux
  define task calculate with a, b {
      return a + b
  }
  ```

* **Default Parameter Values:**
  OmniFlux supports default values for parameters in both syntaxes. If an argument is omitted when calling the task, the default value is used:
  
  ```omniflux
  # Standard syntax with default values
  define task greet(name = "Guest", greeting = "Hello") {
      print(greeting + ", " + name)
  }

  # Natural English syntax with default values
  define task create_user with username, role = "user", active = true {
      print("User: " + username + " (Role: " + role + ", Active: " + active + ")")
  }
  ```

* **Async Execution & Non-Blocking (`background`):**
  By default, all tasks and async bindings in OmniFlux are automatically awaited when called—you never write `await` in OmniFlux.
  
  If you want a task to execute in a non-blocking/asynchronous way (so it runs in the background and returns immediately), prepend the call with the keyword `background`:
  ```omniflux
  # Runs in the background (non-blocking)
  background log_event("Service started")
  ```

* **Task Invocation (Calling Tasks):**
  OmniFlux supports multiple natural ways to call (invoke) tasks:
  
  * **Natural Call with Parameters (`with`):**
    You can call a task using the `with` keyword followed by arguments:
    ```omniflux
    greet_user with "Charlie", 30
    ```

    > [!NOTE]
    > **Syntax Design:** Natural parameter calls using `with` are designed to be written on a **single physical line** for a clean, sentence-like reading flow. If you prefer to format and split arguments across multiple lines for better layout structure, use standard parenthesized calls:
    > ```omniflux
    > greet_user(
    >     "Charlie",
    >     30
    > )
    > ```
  * **Standard Call with Parameters:**
    Traditional call syntax with parentheses is also supported:
    ```omniflux
    greet_user("Charlie", 30)
    ```
  * **Call without Parameters (Parentheses-free):**
    To invoke a task that takes no arguments, you can write its name directly without parentheses:
    ```omniflux
    sayHello
    ```
    (Writing `sayHello()` is also valid).
  * **Function Pointers & References (`ref` and `call`):**
    To get a reference to the task itself (e.g., to pass it as a callback or store it in a variable) without executing it immediately, prefix the task name with `ref`:
    ```omniflux
    var callback = ref sayHello
    ```
    To execute a task reference (callback) dynamically, you can use the `call` keyword:
    ```omniflux
    # Call without parameters
    call callback

    # Call with parameters
    var greet_callback = ref greet_user
    call greet_callback with "Dave", 35
    ```
    (Using traditional parentheses like `callback()` or `callback("Dave", 35)` is also supported).

### 1.4 Printing to the Screen 📺
OmniFlux provides built-in options for outputting text to the screen:

* **`print(...)`**: Prints the given message to the console, automatically appending a trailing newline.
  ```omniflux
  print("Hello, World!")
  print("User score is " + score)
  ```
  It also natively supports format strings:
  ```omniflux
  print("User %s has score %d", username, score)
  ```
* **`printf(format, ...args)`**: Similar to C's `printf`, this function formats a string and prints it to the console **without** automatically appending a trailing newline.
  ```omniflux
  printf("Processing: %d%% completed\r", percent)
  ```

Supported format specifiers include:
* `%s`: String (supports precision truncation, e.g., `%.3s`)
* `%d`, `%i`: Integer (supports padding width and leading zeros, e.g., `%02d`, `%5d`)
* `%f`: Float (supports width and decimal precision, e.g., `%.2f`, `%06.2f`)
* `%j`: JSON serialization of objects
* `%%`: A single percent sign (`%`)

### 1.5 Input & CLI Arguments 📥
OmniFlux provides simple tools to read input and arguments when building command line interfaces:

* **`input(prompt)`**: Prints an optional prompt message and blocks execution synchronously, waiting for user input in the terminal. When the user presses Enter, it returns the input as a string (with the trailing newline stripped).
  ```omniflux
  var username = input("Enter username: ")
  print("Hello, %s!", username)
  ```
* **`read_char()`**: Synchronously reads a single keypress from standard input without waiting for Enter. Returns the captured character as a string. If the user presses Ctrl+C, it terminates the script immediately with a standard SIGINT code (130).
  ```omniflux
  print("Press any key to continue...")
  var key = read_char()
  print("You pressed: %s", key)
  ```
* **`$args`**: A globally available array that contains all CLI arguments passed to the script (excluding the compiler/node command and the script file name itself).
  ```omniflux
  if len($args) > 0 {
      print("First CLI argument: %s", $args[0])
  }
* **`getenv(name)`**: Retrieves the value of the environment variable `name` from the host system. Returns `null` if the variable is not set.
  ```omniflux
  var path = getenv("PATH")
  print("System PATH: %s", path)
  ```
* **`setenv(name, value)`**: Sets the environment variable `name` to the given `value` (which is cast to a string).
  ```omniflux
  setenv("PORT", 8080)
  ```
* **`exit(code)`**: Terminates the current process immediately with the specified integer exit `code` (defaults to `0`).
  ```omniflux
  exit(1)
  ```

---

## 2. Control Flow & Conditionals

OmniFlux provides simple structures for making decisions and handling execution flow.

### 2.1 Conditionals (`if` and `switch`)

#### Making Decisions with `if` / `else`
Use `if`, `else if`, and `else` to execute code based on conditions. Parentheses around conditions are optional.
```omniflux
var score = 85

if score >= 90 {
    print("Excellent!")
} else if score >= 70 {
    print("Good job!")
} else {
    print("Keep trying!")
}
```

#### Multi-way Branching with `switch`
When you need to compare a variable against multiple values, a `switch` statement is cleaner than multiple `if` conditions.
```omniflux
var role = "admin"

switch role {
    case "admin":
        print("Welcome, Administrator!")
        break
    case "editor":
        print("Welcome, Editor!")
        break
    default:
        print("Welcome, User!")
}
```

---

### 2.2 Loops

Loops are used to execute a block of code multiple times. OmniFlux provides two simple loop constructs:

#### The `for` Loop (Iterating over Lists)
Used to step through items in an array or list. The loop variable (like `fruit` in the example below) is created automatically for you without needing the `var` keyword.
```omniflux
var fruits = ["apple", "banana", "cherry"]

for fruit of fruits {
    print("I like " + fruit)
}
```

#### The `while` Loop (Iterating with Conditions)
Repeats a block of code as long as a specific condition remains true. This is also perfect for counter-based loops.
```omniflux
var count = 1

while count <= 5 {
    print("Count is " + count)
    count = count + 1
}
```

### 2.3 Delayed Execution (`wait`)
Allows delaying execution without blocking.
```omniflux
on start {
    print("Initializing...")
    wait 2 seconds
    print("Ready!")
}
```

### 2.4 Periodic Execution (`every`)
Runs a code block periodically.
```omniflux
every 5 minutes {
    clean_expired_sessions()
}
```

### 2.5 Lifecycle Hooks & Execution Order

> [!WARNING]
> **Root-Level Execution & Order of Operations:**
> Any code written at the root level (outside of any function or `on` block) executes immediately when the file is loaded. However, if root-level code contains asynchronous operations (like `wait`), the order of operations cannot be guaranteed. Subsequent synchronous lines will continue executing while the asynchronous task runs in the background. Always place your main execution logic inside `on start` or functions to ensure predictable, sequential execution.

OmniFlux provides several lifecycle hooks to manage application state and events cleanly:

* **`on start { ... }`**
  Executes immediately when the application starts. This is the main entry point of your program.
* **`on shutdown { ... }`**
  Guaranteed to run when the application terminates gracefully (e.g. when receiving a stop signal or system exit). Use this to close database connections or save final state.
* **`on error (err) { ... }`**
  A global error hook that catches any unexpected runtime errors or background failures, preventing the application from crashing silently.
* **`on request (req, res) { ... }`**
  A global middleware event hook that runs on **every incoming HTTP request**, prior to specific route matching. 
  
  ##### Parameters & Structure:
  * **`req` (Request Object):** An object containing the incoming HTTP request details:
    * `req.method`: The HTTP verb (e.g., `"GET"`, `"POST"`).
    * `req.path` / `req.url`: The request URL path (e.g., `"/dashboard"`).
    * `req.query`: A JSON object of query parameters (e.g., `req.query.id`).
    * `req.body`: A JSON object containing parsed POST/PUT request body parameters.
    * `req.headers`: An object containing the request headers (e.g., `req.headers["user-agent"]`).
  * **`res` (Response Object):** An object used to manipulate and send the HTTP response:
    * `res.status(code)`: Sets the HTTP status code (e.g., `res.status(403)`).
    * `res.send(html_or_text)`: Sends raw HTML or plain text content.
    * `res.json(object)`: Serializes and sends a JSON object.
    * `res.redirect(url)`: Redirects the client to another URL.
    * `res.setHeader(name, value)`: Sets an HTTP response header.

  ##### Execution Lifecycle:
  If `on request` sends a response to the client (e.g., calling `res.send(...)` or `respond with ...`), the request execution stops immediately, and the matched route handler (like `GET "/users"`) **will not be executed**. If no response is sent, the server automatically passes control to the matching route handler (`next()`).
  
  This hook is ideal for global tasks like request logging, CORS headers, API authentication checks, or rate limiting.

### 2.6 Local Error Handling (`on error`) 🛡️

To keep your code simple, readable, and free of nested boilerplate (like the `try-catch` blocks found in other languages), OmniFlux provides a clean, flat syntax to handle errors locally.

You can attach an `on error (err)` block directly to the closing brace of any **Route Handler** or **Task**:

#### 1. Route-Level Error Handling
When attached to a route handler, any network, database, or runtime error thrown inside the route will immediately divert execution to your error handler. This allows you to respond to the client with a custom status and message:

```omniflux
POST "/v1/chat/completions" (req, res) {
    # If networkpost fails (e.g. network timeout), execution jumps straight to the on error block
    var response = networkpost("https://api.provider.com/v1/chat", req.body, {
        "Authorization": "Bearer key"
    })
    respond json response
} on error (err) {
    # Respond gracefully without crashing the server
    respond status 502 and json { 
        "error": "Failed to reach AI provider", 
        "details": err.message 
    }
}
```

#### 2. Task-Level Error Handling
Similarly, you can attach an `on error` block to task definitions:

```omniflux
define task load_config(path) {
    var content = fileread(path)
    return JSON.parse(content)
} on error (err) {
    print("Failed to load config: %s", err.message)
    return { "status": "fallback_default" }
}
```

#### 3. Default Compiler Protection
If you do not specify an `on error` block:
* **For Route Handlers:** The compiler automatically wraps the handler in a default safety net. If an unhandled error occurs, it prints the error to the console and responds to the client with a `500 Internal Server Error` (preventing the server from crashing or leaving the connection hanging).
* **For Tasks:** Unhandled errors are caught and re-thrown so they can bubble up to the caller or route handler.

#### 4. Call-Level Error Handling
You can also catch errors on a specific function call or statement using `on error (err)` on the same line. This is perfect for capturing exceptions from library calls (like standard library tasks) and supplying a default/fallback value:

> [!NOTE]
> **Syntax Design:** The start of the call-level `on error (err) {` block must be placed on the **same physical line** as the target statement or function call. This design choice prevents ambiguity, clearly distinguishing local statement-level fallbacks from global process-wide `on error` lifecycle hooks.

* **Single-line statement fallback:**
  ```omniflux
  var data = fileread("config.json") on error (err) { data = "{}" }
  ```
* **Multi-line statement fallback:**
  ```omniflux
  var content = fileread("config.json") on error (err) {
      print("Warning: could not read config: %s", err.message)
      content = "{}"
  }
  ```

---

## 3. Web Server & Routing

OmniFlux has built-in primitives for setting up web servers and HTTP routing.

### 3.1 Initializing Server
```omniflux
listen on port 3000
```

### 3.2 Route Handlers & Responses
Define route handlers to respond to HTTP requests. The syntax specifies the HTTP method (like `GET` or `POST`), the URL path, and a block containing the response:
```omniflux
GET "/users" (req, res) {
    # Send a JSON response with status code
    respond with status 200 and json { "status": "ok" }
}
```

#### Procedural Response Primitives
OmniFlux provides simple, procedural statements for sending HTTP responses, fully hiding Node.js/Express objects. The keyword `with` is optional in all `respond` statements:

* **JSON Responses:**
  * `respond json { "status": "ok" }` (or `respond with json ...`)
  * `respond status 200 and json { "status": "ok" }`

* **HTML & Text Responses:**
  * `respond html "<h1>Welcome</h1>"`
  * `respond status 404 and html "<h1>Not Found</h1>"`
  * `respond text "Hello World"`
  * `respond status 200 and text "Hello World"`

* **File Responses (for sending local files):**
  * `respond file "/path/to/file.png"`
  * `respond status 200 and file "/path/to/file.png"`

  Paths can be absolute or relative. Relative paths are **always resolved relative to the working directory at server startup** — not at request time — making them safe when deployed under process managers like Phusion Passenger.

* **Redirects:**
  * `redirect to "/login"`
  * `redirect to "/login" with status 301` (for permanent redirects)

* **Template Responses (renders and sends HTML templates):**
  * `respond template("views/index.html", { "title": "Home" })`
  * `respond status 200 and template("views/index.html")`

  The template engine reads the `.html` file and processes `{{ variable }}` interpolation and `@if`/`@else`/`@for` control blocks. It also recursively resolves `@include("path/to/partial.html")` directives. Like `respond file`, all paths are resolved relative to the startup working directory, ensuring correct behavior under Passenger.

> **Deployment Note (Apache + Phusion Passenger):**
> When running an OmniFlux server behind Apache with Passenger, Apache's document root is typically set to the `public/` directory. This means any static assets placed in `public/` (CSS, images, JS) are served **directly by Apache** and never reach the OmniFlux application. This is more efficient than serving them through Node.js. Dynamic routes (`GET "/"`, `POST "/api/..."`, etc.) are transparently proxied by Passenger to the OmniFlux process.
>
> To serve static assets when running **standalone** (without Apache), define a single wildcard route:
> ```
> GET "/public/*file" (req, res) {
>     var file_path = req.params.file.join("/")
>     respond with file "public/" + file_path
> }
> ```
> This route is harmlessly ignored under Apache, since Apache intercepts those requests first.

---

## 4. Native Bindings

OmniFlux provides native bindings to common backend services, making setups extremely fast:

* **Databases (Local JSON DB):** Built-in NoSQL document store functions (`dbinsert`, `dbselect`, `dbupdate`, `dbdelete`) that save to a local `db.json` file. Runs in memory for maximum read speed.
* **Caching:** `cacheset(key, value, ttl)` and `cacheget(key)` (backed by Redis).
* **File I/O:** Core file system operations:
  * `fileread(path)`: Reads file contents as a UTF-8 string.
  * `filewrite(path, data)`: Writes data (string or object) to a file.
  * `fileexists(path)`: Returns `true` if the file or directory exists, `false` otherwise.
  * `fileappend(path, data)`: Appends data (string or object) to the end of a file.
  * `fprint(path, format, ...args)`: Formats a string (using the same format specifiers as `print`) and appends it to the end of a file, automatically appending a trailing newline.
  * `fprintf(path, format, ...args)`: Formats a string and appends it to the end of a file **without** automatically appending a trailing newline.
  * `filedelete(path)`: Deletes the specified file.
  * `filecopy(src, dest)`: Copies a file from `src` to `dest`.
  * `filerename(src, dest)`: Renames or moves a file from `src` to `dest`.
  * `dirlist(path)`: Lists the contents of a directory (returns an array of strings).
  * `dircreate(path)`: Creates a directory recursively (including any missing parent directories).
  * `scriptdir()`: Returns the absolute path of the directory containing the currently running script.
  * `filestat(path)`: Returns an object containing file metadata: `{ size, isdirectory, isfile, createdat, modifiedat }`.
* **Strings & Text Processing:**
  * `len(val)`: Returns the length of an array or string.
  * `strsplit(str, sep)`: Splits a string into an array of substrings using the specified separator (supports string or regex separators).
  * `match(str, regex)`: Matches `str` against a regular expression. Returns `true` on success, `false` on failure. If the regex contains capture groups (parentheses) and matches, it returns an array of the captured values.
  * `strtrim(str, side)`: Removes whitespace. `side` is optional and can be `"both"` (default), `"left"`, or `"right"`.
  * `strsub(str, start, length)`: Extracts a substring starting at index `start` with optional `length`.
  * `strindexof(str, search)`: Returns the position of the first occurrence of `search`, or `-1` if not found.
  * `strlastindexof(str, search)`: Returns the position of the last occurrence of `search`, or `-1` if not found.
  * `strrepeat(str, n)`: Repeats the string `n` times.
  * `strreplace(str, search, replacement)`: Replaces occurrences of `search` (string or regex) with `replacement`. If a string is passed as `search`, all occurrences are replaced.
  * `strupper(str)`: Converts the string to uppercase.
  * `strlower(str)`: Converts the string to lowercase.
* **Arrays & Lists:** Procedural array operations:
  * `arraypush(arr, item)`: Appends an item to the end of the array.
  * `arrayunshift(arr, item)`: Prepends an item to the beginning of the array.
  * `arraypop(arr)`: Removes and returns the last item of the array.
  * `arrayshift(arr)`: Removes and returns the first item of the array.
  * `arraycontains(arr, item)`: Returns `true` if the item is present in the array, `false` otherwise.
  * `arrayjoin(arr, sep)`: Joins array elements into a string separated by `sep`.
  * `arrayslice(arr, start, end)`: Returns a slice of the array from `start` (inclusive) to `end` (exclusive).
  * `arrayreverse(arr)`: Returns a new array with elements in reversed order.
  * `arraysort(arr)`: Returns a new array with elements sorted.
  * `arraymap(arr, task)`: Maps elements using an async callback task.
  * `arrayfilter(arr, task)`: Filters elements using an async callback task.
  * `arrayfind(arr, task)`: Finds the first matching element using an async callback task.
* **Path Utilities:** Cross-platform path handling helpers:
  * `pathjoin(...paths)`: Joins multiple path segments together, normalizing directory separators.
    ```omniflux
    pathjoin("src", "utils", "parser.of")  # Returns "src/utils/parser.of"
    ```
  * `pathresolve(base, relative?)`: Resolves a relative path (or sequence of paths) into an absolute path. If `relative` is omitted, resolves `base` against the current working directory.
    ```omniflux
    pathresolve("/home/user", "docs")       # Returns "/home/user/docs"
    pathresolve("/home/user/docs", "../")   # Returns "/home/user"
    ```
  * `pathdirname(filepath)`: Returns the directory portion of a file path.
    ```omniflux
    pathdirname("/src/utils/parser.of")     # Returns "/src/utils"
    ```
  * `pathbasename(filepath)`: Returns the last segment of a path (usually the filename).
    ```omniflux
    pathbasename("/src/utils/parser.of")    # Returns "parser.of"
    ```
  * `pathextension(filepath)`: Returns the file extension (including the dot).
    ```omniflux
    pathextension("/src/utils/parser.of")   # Returns ".of"
    ```
  * `pathisabsolute(filepath)`: Returns `true` if the path is absolute, or `false` if it is relative.
    ```omniflux
    pathisabsolute("/src/main.of")          # Returns true
    pathisabsolute("main.of")               # Returns false
    ```
* **Date & Time:** Procedural time and date components:
  * `time()`: Returns the current Unix timestamp in seconds.
  * `dateyear(ts)`: Returns the year of the given Unix timestamp `ts` (or the current year if `ts` is not provided).
  * `datemonth(ts)`: Returns the month (1-12) of the given Unix timestamp `ts`.
  * `dateday(ts)`: Returns the day of the month (1-31) of the given Unix timestamp `ts`.
  * `datehour(ts)`: Returns the hour (0-23) of the given Unix timestamp `ts`.
  * `dateminute(ts)`: Returns the minute (0-59) of the given Unix timestamp `ts`.
  * `datesecond(ts)`: Returns the second (0-59) of the given Unix timestamp `ts`.
  * `dateweekday(ts, format?)`: Returns the day of the week for the given Unix timestamp `ts` (or the current day if `ts` is not provided). The `format` parameter is optional and defaults to `"number"` (returning `0-6` where Sunday is `0`). Alternatively, passing `"short"` or `"text"` returns a 3-letter day abbreviation (e.g., `"Sun"`, `"Mon"`).
* **Cryptography & Encryption:** Secure hashing and symmetric encryption helpers:
  * `sha256(text)`: Returns the SHA-256 hexadecimal hash string of the input text. Useful for secure password hashing.
  * `encrypt(text, key)`: Encrypts `text` using the `key` via the secure AES-256-CBC algorithm. Generates a unique, random initialization vector (IV) for each call to ensure identical inputs result in different ciphertexts, and returns the result packed as `iv:ciphertext`.
  * `decrypt(encryptedText, key)`: Decrypts `encryptedText` (in the `iv:ciphertext` format) using the provided `key`. Returns the original decrypted string, or `null` if decryption fails (e.g., due to an incorrect key or corrupted input).
* **Web & HTTP Utilities:** Native HTTP helpers:
  * `getcookie(req, name)`: Extracts and returns the value of the cookie `name` from the incoming request `req`. Returns `null` if not found.
  * `setcookie(res, name, value, options?)`: Sets a cookie on the outgoing response `res` with the specified `name` and `value`. The optional `options` object supports standard cookie attributes (such as `httpOnly`, `secure`, `maxAge`, `path`, etc.). *Note: Because cookies are sent in HTTP headers, this must be called before sending any response body (like HTML or JSON) to the client.*
* **JSON Utilities:**
  * `jsonparse(str)` / `jsondecode(str)`: Parses a JSON string and returns the resulting object or array. Returns `null` if the string is not valid JSON. (`jsondecode` is an alias — choose whichever reads more naturally alongside `jsonencode`.)
    ```omniflux
    var data = jsondecode(fileread("settings.json"))
    print(data.name)
    ```
  * `jsonencode(val, pretty?)`: Serializes an object or array into a JSON string. The optional `pretty` parameter (default `false`) formats the output with indentation when set to `true`.
    ```omniflux
    filewrite("settings.json", jsonencode(data, true))
    ```
* **Template Engine:** HTML template rendering and layout generation:
  * `template(source, context)`: Parses, compiles, and renders an HTML template. Automatically detects if `source` is a file path (loading it from disk) or a raw HTML string. Supports:
    * **Dynamic Expressions:** `{{ user.name }}`
    * **Control Flow:** `@if (cond) { ... @else { ... @}` and `@for (item of list) { ... @}`
    * **Static Inclusions:** `@include("templates/header.html")`
    * **SPA Interceptors:** Automatically injects a lightweight client-side script before `</body>` to intercept links and forms with `of-target="selector"`, enabling flicker-free SPA updates and server-driven script execution.


### 4.1 Local JSON Database 🗄️

OmniFlux includes a built-in, zero-setup database that stores your data in a local file (`db.json`). It runs entirely in memory for lightning-fast reads, making it perfect for blogs, catalogs, and basic websites.

#### Database Location & Production Environment Config (`DB_FILE`)
By default, the database is stored in a file named `db.json` in the **current working directory (CWD)** from which the process was started. 

> [!WARNING]
> **Security Best Practice:** Never store the database file (`db.json`) inside a public directory served by web servers like Apache or Nginx (e.g. `public/`, `www/`, or `public_html/`). Doing so allows anyone to download your entire database directly via a browser. Always configure `DB_FILE` to point to a secure, non-public directory (like `/var/lib/omniflux/db.json` or a folder outside of your web root).

If your application is deployed to a production environment where the code directory is write-protected, you can easily configure the database file location by setting the `DB_FILE` environment variable:
```bash
# Run the server with the database file saved in a secure, writable directory
DB_FILE=/var/lib/omniflux/db.json ./omniflux server/proxy.of
```

#### Programmatic Database Path (`dbsetfile` / `db_set_file`)
You can also change the database file path directly within your code using the built-in function `dbsetfile(path)` (alias: `db_set_file(path)`). This is useful if you want to determine the path dynamically or read it from a custom config file:
```omniflux
# Set a custom database location programmatically
dbsetfile("/var/lib/omniflux/db.json")

# Any subsequent database calls will read/write to this file
dbinsert("logs", { event: "startup", time: time() })
```

#### Core Concepts for Beginners
* **Collection:** Think of this as a category or a folder of records. For example, `"users"` or `"posts"`. Each collection contains a list of individual items.
* **Document:** A single record in a collection, represented as an object with key-value pairs (like `{ "name": "Alice", "role": "admin" }`).
* **Filter:** A simple object used to search for matching records. For example, passing `{ "role": "admin" }` will find only those records where the role is `"admin"`. Passing an empty filter `{}` or `null` will retrieve everything.

#### 1. Inserting Data (`dbinsert`)
Adds a new item to a collection. It automatically generates a unique `id` for the record if you don't provide one.
```omniflux
# Save a new user to the "users" collection
var new_user = dbinsert("users", { name: "Alice", email: "alice@example.com", age: 30 })

# The returned object contains the auto-generated unique ID
print("New user created with ID: %s", new_user.id)
```

#### 2. Querying & Finding Data (`dbselect`)
Retrieves records matching a filter. **It always returns an array (a list) of items.**
```omniflux
# Find all users who are admins (using a filter)
var admins = dbselect("users", { role: "admin" })

# Loop through the list to print names
for (var admin of admins) {
    print("Admin: %s", admin.name)
}

# Find a single user by ID
var results = dbselect("users", { id: "mqrlgor5eywc" })
if len(results) > 0 {
    var user = results[0]
    print("Found user: %s", user.name)
}

# Retrieve everything in the collection (no filter)
var all_users = dbselect("users")
```

#### 3. Updating Data (`dbupdate`)
Modifies existing records in a collection matching a filter. Returns the number of updated items.
```omniflux
# Update age for the user with a specific ID
var updated_count = dbupdate("users", { id: "mqrlgor5eywc" }, { age: 31 })
print("Updated %d users.", updated_count)
```

#### 4. Deleting Data (`dbdelete`)
Removes matching records from a collection. Returns the number of deleted items.
```omniflux
# Delete all users who are under 18
var deleted_count = dbdelete("users", { age: 17 })
print("Deleted %d users.", deleted_count)
```

---

## 5. Compiler CLI Options 🛠️

The `omniflux` command line tool provides options to control how your code is compiled and executed:

* `omniflux <filename>`: Compiles and runs the specified file.
* `--compile-only` (or `--no-run`): Compiles the code to JavaScript without running the output file.
* `--strict` (or `--no-llm`): Disables the AI self-healing fallback. If the local compiler encounters syntax it doesn't recognize or if there is a syntax error, the compilation fails immediately and displays the errors. This is ideal for offline development and CI/CD pipelines.
* `--verbose` (or `-v`): Prints detailed usage statistics when communicating with the AI backend, such as the exact model used, request duration, input tokens, output tokens, and reasoning tokens.

---

## 6. Direct Node.js / JavaScript Integration (`@{ ... @}`) ⚡

OmniFlux is designed to keep development simple and clean. However, when you need direct access to the Node.js ecosystem, npm modules, or raw JavaScript APIs, you can write JavaScript code directly inside an escape block using the `@{` and `@}` markers.

### How it works
* Everything written between `@{` and `@}` is copied **verbatim** (exactly as written) to the output JavaScript file.
* The OmniFlux compiler does not parse or validate the contents of the block, meaning you can write complex JavaScript syntax (loops, objects, async code) without triggering compiler warnings.
* You can access and return variables defined in the surrounding OmniFlux code.

### 1. Reading a file using Node's standard `fs` library
```omniflux
define task read_config_file {
    # Escape to Node.js to read a file using the native fs module
    @{
        const fs = require('fs');
        const data = fs.readFileSync('config.json', 'utf8');
        return JSON.parse(data);
    @}
}
```

### 2. Performing native JavaScript calculations or operations
```omniflux
define task get_js_time {
    @{
        return new Date().toISOString();
    @}
}
```

### 3. Error Handling and Line Mapping
If an error occurs inside your `@{ ... @}` block at runtime, the OmniFlux runtime automatically catches the error and maps the line number back to the exact line in your `.of` source file, making debugging extremely easy!

---

## 7. Standard Libraries & Inclusions (`include`) 📦

OmniFlux allows modularizing your code using the `include` directive. The standard library (`stdlib/`) contains pre-built tasks for common activities.

### The `include` Directive
To import another file's variables and tasks into your script, use `include` followed by the relative path of the file:
```omniflux
include "stdlib/datetime.of"
include "stdlib/network.of"
include "stdlib/system.of"
```

### 7.1 Date & Time Library (`stdlib/datetime.of`)
Provides simplified tasks for reading and formatting dates:
* `datetime_now()`: Returns the current Unix timestamp.
* `datetime_format(timestamp, format_string)`: Formats a Unix timestamp. Supported tokens are `YYYY` (year), `MM` (month), `DD` (day), `HH` (hour), `mm` (minute), and `ss` (seconds).
```omniflux
include "stdlib/datetime.of"

on start {
    var now = datetime_now()
    var pretty_date = datetime_format(now, "YYYY-MM-DD HH:mm:ss")
    print("Current time: %s", pretty_date)
}
```

### 7.2 Network Library (`stdlib/network.of`)
Provides tasks for sending HTTP requests and talking to public APIs:
* `networkget(url)`: Performs an HTTP GET request to the specified URL. Automatically parses and returns JSON if the response is JSON, otherwise returns plain text.
* `networkpost(url, data)`: Performs an HTTP POST request to the specified URL, sending the data payload (either an object or a raw string).
```omniflux
include "stdlib/network.of"

on start {
    # Fetch a joke from a public API
    var joke = networkget("https://official-joke-api.appspot.com/random_joke")
    print("Joke: %s", joke.setup)
    print("Answer: %s", joke.punchline)
    
    # Submit data to an API
    var response = networkpost("https://httpbin.org/post", { username: "Alice" })
    print("Response status: %s", response.url)
}
```

### 7.3 System Commands Library (`stdlib/system.of`)
Provides tasks for executing and managing processes in the host OS shell:
* `system(command)`: Runs a command in the shell and returns its full output (stdout and stderr merged) as a string.
* `exec(command)`: Runs a command in the shell and returns its exit status code (0 for success, non-zero for failure).
* `spawn(command, args)`: Spawns an asynchronous child process with the given arguments array, returning its process ID (PID).
* `kill(pid, signal)`: Sends a signal (e.g. `"SIGTERM"` or `"SIGKILL"`) to the specified PID. Returns `true` on success, `false` on failure.

```omniflux
include "stdlib/system.of"

on start {
    # 1. Run a command and capture output
    var folder_contents = system("ls -la")
    print("Files:\n%s", folder_contents)
    
    # 2. Run a command and check success status
    var status = exec("git status")
    if status == 0 {
        print("Git command completed successfully!")
    } else {
        print("Git command failed with status code: %d", status)
    }
    
    # 3. Spawn a background process and kill it later
    var pid = spawn("node", ["server.js"])
    print("Spawned process with PID: %d", pid)
    
    wait 2000
    
    var success = kill(pid, "SIGTERM")
    print("Process termination result: %s", success)
}
```
