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

## 2. Control Flow & Asynchronous Loops

OmniFlux simplifies asynchronous logic and background execution into simple, clean statements.

### 2.1 Delayed Execution (`wait`)
Allows delaying execution without blocking the main event loop.
```omniflux
on start {
    print("Initializing...")
    wait 2 seconds
    print("Ready!")
}
```

### 2.2 Periodic Execution (`every`)
Runs a code block periodically.
```omniflux
every 5 minutes {
    clean_expired_sessions()
}
```

### 2.3 Lifecycle Hooks
* `on start { ... }`: Executes immediately when the script runs.
* `on shutdown { ... }`: Executes when the script receives a shutdown signal (e.g., SIGTERM or SIGINT).

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
