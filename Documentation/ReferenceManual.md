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

* **Redirects:**
  * `redirect to "/login"`
  * `redirect to "/login" with status 301` (for permanent redirects)

* **Template Responses (renders and sends HTML templates):**
  * `respond template("views/index.html", { "title": "Home" })`
  * `respond status 200 and template("views/index.html")`

---

## 4. Native Bindings

OmniFlux provides native bindings to common backend services, making setups extremely fast:

* **Databases:** `dbquery(query, params)` (uses secure, prepared MySQL statements under the hood).
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
  * `filestat(path)`: Returns an object containing file metadata: `{ size, isdirectory, isfile, createdat, modifiedat }`.
* **Arrays & Lists:** Procedural array and string operations:
  * `len(val)`: Returns the length of an array or string.
  * `strsplit(str, sep)`: Splits a string into an array of substrings using the specified separator.
  * `match(str, regex)`: Performs a regular expression match on `str`. Returns `true` if there is a match (without capturing groups), `false` if there is no match, or an array of captured groups (excluding the full match, so index 0 is the first captured group) if capturing groups exist in the `regex` and the match succeeds. The `regex` parameter supports `RegExp` objects or string-based patterns. When using strings, you can use standard delimiters like `/` (e.g. `"/\\d+/i"`) or alternate delimiters like `~` (e.g. `"~\\d+~i"`) or `#`.
  * `arraypush(arr, item)`: Appends an item to the end of the array.
  * `arraypop(arr)`: Removes and returns the last item of the array.
  * `arraycontains(arr, item)`: Returns `true` if the item is present in the array, `false` otherwise.
  * `arrayjoin(arr, sep)`: Joins array elements into a string separated by `sep`.
  * `arrayslice(arr, start, end)`: Returns a slice of the array from `start` (inclusive) to `end` (exclusive).
* **Date & Time:** Procedural time and date components:
  * `time()`: Returns the current Unix timestamp in seconds.
  * `dateyear(ts)`: Returns the year of the given Unix timestamp `ts` (or the current year if `ts` is not provided).
  * `datemonth(ts)`: Returns the month (1-12) of the given Unix timestamp `ts`.
  * `dateday(ts)`: Returns the day of the month (1-31) of the given Unix timestamp `ts`.
  * `datehour(ts)`: Returns the hour (0-23) of the given Unix timestamp `ts`.
  * `dateminute(ts)`: Returns the minute (0-59) of the given Unix timestamp `ts`.
  * `datesecond(ts)`: Returns the second (0-59) of the given Unix timestamp `ts`.
* **Template Engine:** HTML template rendering and layout generation:
  * `template(source, context)`: Parses, compiles, and renders an HTML template. Automatically detects if `source` is a file path (loading it from disk) or a raw HTML string. Supports:
    * **Dynamic Expressions:** `{{ user.name }}`
    * **Control Flow:** `@if (cond) { ... @else { ... @}` and `@for (item of list) { ... @}`
    * **Static Inclusions:** `@include("templates/header.html")`
    * **SPA Interceptors:** Automatically injects a lightweight client-side script before `</body>` to intercept links and forms with `of-target="selector"`, enabling flicker-free SPA updates and server-driven script execution.

---

## 5. Compiler CLI Options 🛠️

The `omniflux` command line tool provides options to control how your code is compiled and executed:

* `omniflux <filename>`: Compiles and runs the specified file.
* `--compile-only` (or `--no-run`): Compiles the code to JavaScript without running the output file.
* `--strict` (or `--no-llm`): Disables the AI self-healing fallback. If the local compiler encounters syntax it doesn't recognize or if there is a syntax error, the compilation fails immediately and displays the errors. This is ideal for offline development and CI/CD pipelines.
* `--verbose` (or `-v`): Prints detailed usage statistics when communicating with the AI backend, such as the exact model used, request duration, input tokens, output tokens, and reasoning tokens.
