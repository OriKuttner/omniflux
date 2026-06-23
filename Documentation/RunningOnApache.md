# Running OmniFlux on Apache Server with Phusion Passenger

This guide explains how to deploy and run an OmniFlux application on a server running the Apache web server, using **Phusion Passenger** to manage and scale the Node.js processes automatically.

## Prerequisites
- A Linux server (Ubuntu/Debian recommended) running Apache (`apache2`).
- Node.js and Perl installed on the server.
- OmniFlux installed and configured on the server.

## Step 1: Compile the OmniFlux Application
Before deploying, compile your OmniFlux entry file (e.g., `main.of`) into a single, bundled JavaScript file without running it:
```bash
perl ./omniflux main.of --compile-only
```
This command generates the bundled `main.js` file in your application directory.

## Step 2: Install Phusion Passenger
To install Passenger and the Apache integration module on Ubuntu/Debian:

1. Install prerequisite packages:
```bash
sudo apt-get install -y dirmngr gnupg apt-transport-https ca-certificates curl
```

2. Add the official Passenger PGP key:
```bash
curl https://oss-binaries.phusionpassenger.com/auto-software-key.txt | gpg --dearmor | sudo tee /usr/share/keyrings/phusionpassenger.gpg >/dev/null
```

3. Add the Passenger APT repository for your specific Linux distribution:
```bash
. /etc/os-release
echo "deb [signed-by=/usr/share/keyrings/phusionpassenger.gpg] https://oss-binaries.phusionpassenger.com/apt/passenger $VERSION_CODENAME main" | sudo tee /etc/apt/sources.list.d/passenger.list
```

4. Update your local package list and install the Apache passenger module (`libapache2-mod-passenger`):
```bash
sudo apt-get update
sudo apt-get install -y libapache2-mod-passenger
```

5. Enable the passenger module in Apache and restart the web server:
```bash
sudo a2enmod passenger
sudo systemctl restart apache2
```

## Step 3: Verify the Installation
Verify that Phusion Passenger is installed correctly and running:
```bash
sudo passenger-memory-stats
```
This command should print a summary of the memory usage of all Passenger processes, confirming it is active.

You can also inspect the status of the process manager with:
```bash
sudo passenger-status
```

## Step 4: Directory Structure and Apache Virtual Host Configuration

### Recommended Directory Structure
To handle static files (CSS, client-side JS, images) securely and efficiently, create a subdirectory named `public` inside your application directory. Place all public assets in this folder:

```
/var/www/my-omniflux-app/
├── public/                 <-- Public static files (CSS, JS, images)
│   ├── css/
│   │   └── style.css
│   └── images/
│       └── logo.png
├── main.js                 <-- Compiled executable bundle
└── config.json             <-- Server-only configuration files (protected)
```

By pointing Apache's `DocumentRoot` to the `public` subdirectory, Passenger automatically infers that the parent directory (`/var/www/my-omniflux-app`) is the application root. Any request matching a physical file in the `public` folder will be served directly by Apache without invoking the Node.js application, while all other requests are forwarded to OmniFlux.

> [!WARNING]
> **Rigid Directory Naming Convention**
> Phusion Passenger's automatic root detection strictly expects the public folder to be named exactly `public`. If you name this folder anything else (such as `www`, `static`, or `public_html`), Passenger will not automatically find your application root, causing compilation/startup errors.
> 
> If you choose to use a custom directory name like `www`, you **must** explicitly specify the `PassengerAppRoot` directive pointing to the parent folder in your Virtual Host config:
> ```apache
> PassengerAppRoot /var/www/my-omniflux-app
> PassengerStartupFile main.js
> ```

### Virtual Host Configuration
Create or update your Apache site configuration file (e.g., `/etc/apache2/sites-available/yourdomain.conf`):

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    # Point Apache directly to the public subdirectory
    DocumentRoot /var/www/my-omniflux-app/public

    # Enable Passenger and point it to the compiled JS bundle
    PassengerEnabled on
    PassengerAppType node
    PassengerStartupFile main.js

    <Directory /var/www/my-omniflux-app/public>
        AllowOverride all
        Require all granted
    </Directory>

    # Log files configuration
    ErrorLog ${APACHE_LOG_DIR}/omniflux_error.log
    CustomLog ${APACHE_LOG_DIR}/omniflux_access.log combined
</VirtualHost>
```

Activate the new site (if it's not already enabled) and reload Apache to apply the configuration:
```bash
sudo a2ensite yourdomain.conf
sudo systemctl reload apache2
```

## Deploying Updates (Zero-Downtime Reload)

You do **not** need to restart or reload the Apache web server when deploying updates to your OmniFlux application.

Phusion Passenger supports hot-reloading using a `restart.txt` file. When you compile a new version of your application into `main.js`, run the following command to instruct Passenger to reload the application on the next request:

```bash
mkdir -p /var/www/my-omniflux-app/tmp
touch /var/www/my-omniflux-app/tmp/restart.txt
```

Passenger will detect that the modification time of `restart.txt` has changed, gracefully shutdown the old Node.js process, and spawn a new one with your updated code.

## How it Works under the Hood
When Passenger starts, it automatically intercepts calls to Node's `http.Server.listen()` (which is compiled from `listen on port` in OmniFlux). It overrides the port number and forces the application to listen on a dynamically generated, secure Unix domain socket or private TCP port. Passenger then automatically forwards traffic from Apache to this socket, eliminating port conflicts and manual port configuration.

## Troubleshooting & Common Issues

Deploying Node.js applications on legacy Linux environments (like Ubuntu 18.04) running older versions of Phusion Passenger can lead to server compatibility issues. Below are solutions to the most common problems:

### 1. HTTP 403 Forbidden on the Home Directory
If accessing your domain returns a `403 Forbidden` error and Passenger does not start:
* **Cause:** Apache (running as `www-data`) does not have execute (`+x`) permissions to navigate the parent directories of your application (e.g., `/home/rlcpa`).
* **Solution:** Grant traverse/read permissions to Apache for your project structure:
  ```bash
  chmod o+x /home/USERNAME
  chmod o+x /home/USERNAME/APP_DIR
  chmod -R o+rx /home/USERNAME/APP_DIR/public
  ```

### 2. SyntaxError: Unexpected token . (Optional Chaining)
If Passenger crashes during startup with a `SyntaxError` referencing `options?.parameters` or similar modern JS syntax:
* **Cause:** Apache/Passenger is using an outdated system Node.js version (like Node.js 8 or 10) which does not support modern JavaScript syntax (such as optional chaining `?.` or nullish coalescing `??`).
* **Solution:** Find the path to a modern Node.js version (v16+) on your server:
  ```bash
  which node
  ```
  Then explicitly specify that binary in your Apache Virtual Host configuration using the `PassengerNodejs` directive:
  ```apache
  PassengerNodejs /usr/bin/node
  ```
  Reload Apache:
  ```bash
  sudo systemctl reload apache2
  ```

### 3. ReferenceError: GLOBAL is not defined
If Passenger fails to start with a traceback inside its internal files:
```
ReferenceError: GLOBAL is not defined
    at Object.<anonymous> (/usr/share/passenger/helper-scripts/node-loader.js:41:1)
```
* **Cause:** Passenger (specifically older versions like 5.x) has hardcoded usage of `GLOBAL` in its internal loader scripts, but modern Node.js versions (v16+) removed this deprecated keyword in favor of `global`.
* **Solution:** Replace the deprecated `GLOBAL` keyword with `global` in Passenger's loader script using `sed`:
  ```bash
  sudo sed -i 's/\bGLOBAL\b/global/g' /usr/share/passenger/helper-scripts/node-loader.js
  ```
  Reload Apache:
  ```bash
  sudo systemctl reload apache2
  ```
