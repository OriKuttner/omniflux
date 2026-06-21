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

```omniflux
$app_name = "OmniFlux App"  # Global variable
var local_counter = 1      // Block-scoped local variable
```

### 1.3 Tasks (Functions)
Functions in OmniFlux can be declared using two equivalent syntaxes:
* **Short Syntax:**
  ```omniflux
  fn calculate(a, b) {
      return a + b
  }
  ```
* **Natural Syntax:**
  ```omniflux
  define task calculate(a, b) {
      return a + b
  }
  ```
  Or with parameter descriptions:
  ```omniflux
  define task calculate with a, b {
      return a + b
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
* **`on shutdown { ... }`** (or **`on end { ... }`**)
  Guaranteed to run when the application terminates gracefully (e.g. when receiving a stop signal or system exit). Use this to close database connections or save final state.
* **`on error (err) { ... }`**
  A global error hook that catches any unexpected runtime errors or background failures, preventing the application from crashing silently.
* **`on request (req, res) { ... }`**
  A global event hook that runs on **every single incoming HTTP request**, regardless of the URL path. Unlike specific route handlers (which only run for a specific path like `/users`), `on request` is perfect for global tasks like logging requests, checking user authentication, or adding security headers before a request reaches its specific route.

---

## 3. Web Server & Routing

OmniFlux has built-in primitives for setting up web servers and HTTP routing.

### 3.1 Initializing Server
```omniflux
listen on port 3000
```

### 3.2 Route Handlers
* **Short Route Handler:**
  ```omniflux
  GET "/users" (req, res) {
      respond with status 200 and json { "status": "ok" }
  }
  ```
* **Natural Route Handler:**
  ```omniflux
  when receiving GET request to "/profile": {
      var user_id = id from query
      respond with status 200 and json { "user": user_id }
  }
  ```

---

## 4. Native Bindings

OmniFlux provides native bindings to common backend services, making setups extremely fast:

* **Databases:** `db_query(query, params)` (uses secure, prepared MySQL statements under the hood).
* **Caching:** `cache_set(key, value, ttl)` and `cache_get(key)` (backed by Redis).
* **File I/O:** `file_read(path)` and `file_write(path, data)`.
