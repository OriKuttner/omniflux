# OmniFlux 🌌

<p align="center">
  <img src="assets/logo.png" alt="OmniFlux Logo" width="300" />
</p>

<p align="center">
  <a href="https://omniflux.helicontech.co.il"><b>🌐 Official Website</b></a> | 
  <a href="https://github.com/OriKuttner/omniflux"><b>🐱 GitHub Repository</b></a>
</p>

> **"Because compiling code shouldn't feel like negotiating a peace treaty with your terminal."**

OmniFlux is a minimalist, conversational, and self-healing programming language transpiled to Node.js. 

It was born out of pure frustration with the state of modern programming languages. It is designed for developers who are tired of fighting their tooling and just want to write logic that runs.

---

## 😤 The Frustration: Why OmniFlux?

Let's be honest. Modern programming has become a competition of who can build the most over-engineered compiler.

### 🐍 The Python Illusion
Everyone acts like Python is the "easiest language in the world," yet nobody wants to admit the truth: **Python is frustrating and slows you down.**
* **The "One Obvious Way" Myth:** Python's zen famously claims there should be "only one obvious way to do it." In reality, the ecosystem is a labyrinth of deprecated libraries, contradicting tutorials, and over-engineered standard modules. Try setting up something as simple as `gettext` for internationalization, and you will spend half a day fighting confusing locale configurations and conflicting StackOverflow answers, only to give up and write your own dictionary parser.
* **Whitespace Tyranny:** Copy-pasting code should be simple. In Python, one misplaced space or a mix of tabs and spaces, and your entire application crashes instantly with an `IndentationError`.
* **Version and Path Chaos:** `python` vs `python3`. `pip` vs `pip3`. You write a script, and it fails to run because your system environment paths are pointing to the wrong Python binary version.
* **The Package & Environment Hell:** Modern Linux distributions now block global packages completely with scary `externally-managed-environment` errors (PEP 668). This forces even absolute beginners to deal with the nightmare of virtual environments (`venv`, `poetry`, `pipenv`, `conda`) just to install a single package.

### ❌ The TypeScript / Current Tooling Burnout
TypeScript started as a good idea, but now it feels like coding with a strict school principal watching over your shoulder. You spend 80% of your time writing complex generic types (`Type<'T', KeyOf<U>>`) just to make the linter happy, and only 20% writing actual business logic. 

---

## 🚀 The OmniFlux Solution: Zero Compilation Errors. Period.

OmniFlux is built on a single, powerful principle: **There are no compiler errors in OmniFlux.**

Instead of crashing and throwing angry red lines in your face, the OmniFlux compiler uses a localized Large Language Model (LLM) engine to:
1. **Understand Intent:** If you omit a semicolon, miss a parenthesis, or forget to declare a variable, the compiler infers your intent, heals the code, and proceeds.
2. **Self-Healing Conflict Resolution:** If you define a global variable or function twice across different files, the compiler doesn't fail. It either heals the duplication dynamically or asks you a simple question in plain English to clarify what you wanted to do.
3. **PHP-style Simplicity, Node.js Speed:** You can split your code into multiple files and use `include "file.of"` recursively (just like PHP's `include_once`). 

---

## 🛠️ Under the Hood: The Incremental Build System

To keep development fast and cheap, OmniFlux implements a **Make-style build pipeline**:
* **File Hashing (MD5):** It tracks changes to your source files. Only modified files are sent to the LLM for transpilation.
* **Fast Local Bundling (`esbuild`):** Once the intermediate files are generated, they are bundled locally using `esbuild` into a single, optimized, standalone production executable in 2-4 milliseconds.
* **Auto-Execution:** The compiler automatically runs the compiled bundle via Node.js immediately after a successful build. If no files changed, it skips compilation entirely and runs the cached bundle instantly.

---

## 📦 Installation & Setup

OmniFlux requires **Node.js** (version 16 or higher) to be installed on your system.

> [!WARNING]
> The release packages for Linux, macOS, and Windows are currently experimental and have not been fully tested. We would appreciate contributors who can test them on various environments and help create more robust, native packages!

### Option 1: Quick Install (Linux & macOS)
You can download the appropriate release package (`.tar.gz`) for your platform, extract it, and run the included installer:
```bash
tar -xzf omniflux-linux.tar.gz   # or omniflux-macos.tar.gz
cd omniflux-release
sudo ./install.sh
```
This installs the compiler to `/usr/local/bin/omniflux` and the assets to `/usr/local/share/omniflux`.

### Option 2: Quick Install (Windows)
Download `omniflux-windows.zip`, extract it to a directory, open PowerShell, and run the installation script:
```powershell
.\install.ps1
```
This installs the compiler to your local `AppData\Local\OmniFlux` directory and automatically configures your user environment PATH.

### Option 3: Manual / Developer Clone
1. Clone the repository to your local environment.
2. Initialize and configure the compiler for the first time:
   ```bash
   ./compiler/omniflux --setup
   ```
3. Compile and run your code:
   ```bash
   ./compiler/omniflux main.of
   ```
4. (Optional) Run with `--no-run` to compile without executing:
   ```bash
   ./compiler/omniflux main.of --no-run
   ```

### ⚠️ Troubleshooting: APT Dependency Deadlock (Node.js < 16)

If you attempt to install `omniflux.deb` on a system with an older Node.js version (e.g., Node 12), `dpkg` will fail with a dependency error:
```
dpkg: dependency problems prevent configuration of omniflux:
 omniflux depends on nodejs (>= 16.0.0); however:
  Version of nodejs on system is 12.22.9~dfsg-1ubuntu3.6.
```

If you try to upgrade Node.js afterwards using `sudo apt-get install nodejs`, `apt` might block the installation or offer to uninstall `omniflux` to resolve the conflict. This is a classic APT dependency deadlock.

**To resolve the deadlock and install OmniFlux correctly:**

1. **Purge the broken package registration** to clear the APT deadlock:
   ```bash
   sudo dpkg --purge omniflux
   ```
2. **Upgrade Node.js** to the latest LTS version (Node 20) using the official NodeSource script.
   
   *If you encounter a conflict error regarding `libnode-dev` trying to overwrite `/usr/include/node/common.gypi`, purge the old `libnode-dev` package first and then install:*
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get purge -y libnode-dev
   sudo apt-get install -y nodejs
   ```
   *Otherwise, simply run:*
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Re-install the Debian package**:
   ```bash
   sudo dpkg -i omniflux.deb
   ```

---

## 🔌 Editor Support (VS Code & Antigravity)

OmniFlux includes a VS Code extension for syntax highlighting and code snippets. This extension is compatible with both the original **VS Code** and the **Antigravity** editor.

### Option 1: Graphical Interface (GUI) Installation (via VSIX)
1. Open your editor (**VS Code** or **Antigravity**).
2. Open the **Extensions** view (`Ctrl+Shift+X` or via the left sidebar).
3. Click the **`...`** (More Actions / Views) menu button at the top-right corner of the Extensions panel.
4. Select **Install from VSIX...** from the dropdown.
5. Locate and select the `.vsix` package:
   * **If installed via the Debian package:** `/usr/share/omniflux/extensions/omniflux-support/omniflux-support-1.0.3.vsix`
   * **If cloned from the Git repository:** `editors/vscode/omniflux-support-1.0.3.vsix` inside the cloned directory.
6. Click **Install**.

### Option 2: Command Line (CLI) Installation
Run the command corresponding to your editor to install the pre-packaged extension:
* **VS Code:**
  ```bash
  code --install-extension /usr/share/omniflux/extensions/omniflux-support
  ```
* **Antigravity:**
  ```bash
  antigravity --install-extension /usr/share/omniflux/extensions/omniflux-support
  ```

### Option 3: Manual Directory Linking
Alternatively, you can link the extension directory directly to your editor's extension folder:
* **VS Code:**
  ```bash
  mkdir -p ~/.vscode/extensions
  ln -sf /usr/share/omniflux/extensions/omniflux-support ~/.vscode/extensions/omniflux-support
  ```
* **Antigravity:**
  ```bash
  mkdir -p ~/.antigravity/extensions
  ln -sf /usr/share/omniflux/extensions/omniflux-support ~/.antigravity/extensions/omniflux-support
  ```

---

## ✍️ Language Syntax At a Glance

OmniFlux keeps it simple.

```omniflux
# This is a comment
include "helper.of"

on start {
    # Variables starting with $ are strictly global
    $app_name = "OmniFlux App"
    
    sayHello()
}
```

And in `helper.of`:
```omniflux
fn sayHello() {
    print("Welcome to " + $app_name)
}
```

When you compile `main.of`, OmniFlux automatically transpiles both files, links them, bundles them using `esbuild`, and runs:
```
Welcome to OmniFlux App
```

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details. This ensures the project remains open, free, and collaborative forever.
