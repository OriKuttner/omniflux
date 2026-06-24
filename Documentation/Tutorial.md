# OmniFlux: A Frictionless Programming Language

Welcome to OmniFlux! This tutorial is designed to get you up and running with the language, understand its design philosophy, and learn how to write clean, productive code.

---

## 1. The Philosophy of OmniFlux

In the modern programming landscape, languages often compete on which one can be more complex, introducing endless layers of abstraction, strict typing systems, and complex syntax rules. OmniFlux was created with a different vision: **simplicity, readability, and immediate productivity.**

OmniFlux is designed as a **frictionless, purely procedural scripting language**. It strips away unnecessary boilerplate to give you a clean, English-like syntax that executes on top of the high-performance Node.js runtime.

### Core Principles:
*   **Procedural First:** Code should read like a sequence of steps. There is no overhead of objects, classes, or complex architectural boilerplate.
*   **Frictionless Async:** Every asynchronous operation (like reading a file, querying a database, or contacting a server) is automatically awaited. You write simple, linear code without having to think about promises, callbacks, or `async`/`await` keywords.
*   **Safe Globals:** Accessing global variables is frictionless. Undeclared globals safely return `null` (similar to PHP) rather than crashing the system, preventing unexpected runtime errors while you iterate.
*   **Strict Locals:** While globals are flexible, local variables are strictly verified at compile-time to protect you from simple typos.
*   **A Compiler That Helps, Not Fights:** When syntax errors occur (like a forgotten or extra closing brace), the compiler guides you directly to the cause. If a block is closed prematurely, the compiler lists recent block closures (with their exact open and close line numbers) so you can pinpoint the issue immediately instead of hunting through unrelated lines.

> [!NOTE]
> OmniFlux code is compiled to standard JavaScript and bundled for execution using a high-performance engine, giving you the simplicity of a scripting language with the speed and ecosystem of Node.js.

---

## 2. Basic Syntax & Concepts

Let's look at the basic building blocks of OmniFlux.

### Variables
Variables are declared using `var` or `const`. Global variables are prefixed with `$` to make them easily distinguishable from local variables.

```omniflux
# Local variables
var x = 10
const PI = 3.14

# Global variables (available anywhere, defaults to null if uninitialized)
$global_counter = 42
```

### Type Casting & Inspection
OmniFlux is dynamically typed. You can inspect the type of any variable using `describe`, or cast values using `as`:

```omniflux
var count = "10" as int
var price = 9.99 as string

print(describe count) # Prints: number
print(describe price) # Prints: string
```

---

## 3. Tasks and Functions

In OmniFlux, reusable blocks of code are defined as **tasks** (or `fn`). You can declare and invoke them using standard parenthesized syntax or natural English-like syntax.

### Defining Tasks
```omniflux
# Natural English style
define task greet_user with name, greeting = "Hello" {
    print(greeting + ", " + name)
}

# Standard style
define task add_numbers(a, b) {
    return a + b
}
```

### Invocation Styles
You can choose the invocation style that fits your code flow:

```omniflux
# Natural calling (no parentheses)
greet_user with "Alice", "Welcome"

# Standard calling
var sum = add_numbers(5, 10)
```

---

## 4. Practical Examples

Here are some real-world examples demonstrating how simple it is to build applications in OmniFlux.

### Example 1: Reading and Writing Files
All file operations are synchronous and simple:

```omniflux
var filename = "output.txt"

# Write data to a file
filewrite(filename, "Hello from OmniFlux!")

# Read it back
if fileexists(filename) {
    var content = fileread(filename)
    print("File Content: " + content)
}
```

### Example 2: Non-Blocking Background Tasks
If you want to run a task without blocking the execution flow, use the `background` keyword:

```omniflux
define task send_email_notification with recipient {
    # Simulate email sending delay
    wait 2 seconds
    print("Email sent to " + recipient)
}

on start {
    # This runs in the background instantly
    background send_email_notification with "user@example.com"
    
    print("Continuing program execution immediately...")
}
```

### Example 3: Simple HTTP Routing & Server
Building web pages with HTML templating is extremely straightforward:

```omniflux
# Register an HTTP GET route
on request GET "/" {
    var data = {
        title: "OmniFlux Homepage",
        items: ["Simple", "Productive", "Frictionless"]
    }
    
    # Render template file and respond
    var html = template("views/index.html", data)
    respond html
}

on start {
    # Start the server on port 3000
    server port 3000
}
```

---

## 5. Summary of Built-in Bindings

OmniFlux comes out of the box with standard procedural utilities:

| Function | Description |
| :--- | :--- |
| `print(fmt, ...args)` | Prints formatted output to console |
| `input(prompt)` | Reads a line of input from stdin |
| `readchar()` | Reads a single character/keypress from stdin |
| `fileread(path)` | Reads the contents of a file |
| `filewrite(path, data)` | Writes data to a file |
| `dbquery(sql, params)` | Executes a MySQL database query |
| `cacheget(key)` / `cacheset(...)` | Gets or sets values in Redis |
| `time()` | Returns current Unix timestamp |

Now you are ready to write your first OmniFlux application! Run the compiler on any `.of` file using `omniflux <filename>.of --strict` to build and execute.
