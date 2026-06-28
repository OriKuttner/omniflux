#!/bin/bash
set -e

echo "Building OmniFlux Linux, macOS, and Windows release packages..."

# 1. Recompile compiler to make sure we have the latest version in root
cp compiler/omniflux omniflux

# Create temporary directories inside workspace (avoiding /tmp per user rules)
BUILD_LINUX="./linux_release_build"
BUILD_MACOS="./macos_release_build"
BUILD_WINDOWS="./windows_release_build"

rm -rf "$BUILD_LINUX" "$BUILD_MACOS" "$BUILD_WINDOWS"
mkdir -p "$BUILD_LINUX/bin"
mkdir -p "$BUILD_LINUX/share/omniflux"
mkdir -p "$BUILD_MACOS/bin"
mkdir -p "$BUILD_MACOS/share/omniflux"
mkdir -p "$BUILD_WINDOWS"

# ----------------- Linux Package -----------------
echo "Packaging for Linux..."
cp ./omniflux "$BUILD_LINUX/bin/omniflux"
cp ./runtime.js "$BUILD_LINUX/share/omniflux/runtime.js"
cp -r ./stdlib "$BUILD_LINUX/share/omniflux/"
cp -r ./assets "$BUILD_LINUX/share/omniflux/"

# Create install.sh for Linux
cat << 'EOF' > "$BUILD_LINUX/install.sh"
#!/bin/bash
set -e
echo "-------------------------------------------------------------"
echo "Installing OmniFlux for Linux..."
echo "-------------------------------------------------------------"

# Copy binary
sudo mkdir -p /usr/local/bin
sudo cp bin/omniflux /usr/local/bin/omniflux
sudo chmod +x /usr/local/bin/omniflux

# Copy runtime, stdlib, assets
sudo mkdir -p /usr/local/share/omniflux
sudo cp share/omniflux/runtime.js /usr/local/share/omniflux/runtime.js
sudo cp -r share/omniflux/stdlib /usr/local/share/omniflux/
sudo cp -r share/omniflux/assets /usr/local/share/omniflux/

echo "OmniFlux installed successfully to /usr/local/bin/omniflux!"
echo "-------------------------------------------------------------"
EOF
chmod +x "$BUILD_LINUX/install.sh"

tar -czf omniflux-linux.tar.gz -C "$BUILD_LINUX" bin share install.sh
rm -rf "$BUILD_LINUX"
echo "Created omniflux-linux.tar.gz"

# ----------------- macOS Package -----------------
echo "Packaging for macOS..."
cp ./omniflux "$BUILD_MACOS/bin/omniflux"
cp ./runtime.js "$BUILD_MACOS/share/omniflux/runtime.js"
cp -r ./stdlib "$BUILD_MACOS/share/omniflux/"
cp -r ./assets "$BUILD_MACOS/share/omniflux/"

# Create install.sh for macOS
cat << 'EOF' > "$BUILD_MACOS/install.sh"
#!/bin/bash
set -e
echo "-------------------------------------------------------------"
echo "Installing OmniFlux for macOS..."
echo "-------------------------------------------------------------"

# Copy binary
sudo mkdir -p /usr/local/bin
sudo cp bin/omniflux /usr/local/bin/omniflux
sudo chmod +x /usr/local/bin/omniflux

# Copy runtime, stdlib, assets
sudo mkdir -p /usr/local/share/omniflux
sudo cp share/omniflux/runtime.js /usr/local/share/omniflux/runtime.js
sudo cp -r share/omniflux/stdlib /usr/local/share/omniflux/
sudo cp -r share/omniflux/assets /usr/local/share/omniflux/

echo "OmniFlux installed successfully to /usr/local/bin/omniflux!"
echo "-------------------------------------------------------------"
EOF
chmod +x "$BUILD_MACOS/install.sh"

tar -czf omniflux-macos.tar.gz -C "$BUILD_MACOS" bin share install.sh
rm -rf "$BUILD_MACOS"
echo "Created omniflux-macos.tar.gz"

# ----------------- Windows Package -----------------
echo "Packaging for Windows..."
cp ./omniflux "$BUILD_WINDOWS/omniflux"
cp ./runtime.js "$BUILD_WINDOWS/runtime.js"
cp -r ./stdlib "$BUILD_WINDOWS/"
cp -r ./assets "$BUILD_WINDOWS/"

# Create omniflux.cmd for Windows
cat << 'EOF' > "$BUILD_WINDOWS/omniflux.cmd"
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\omniflux" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\omniflux" %*
)
EOF

# Create install.ps1 for Windows
cat << 'EOF' > "$BUILD_WINDOWS/install.ps1"
# install.ps1
# Installer script for OmniFlux on Windows. Installs to user AppData folder (no admin privileges required).
$installDir = "$env:USERPROFILE\AppData\Local\OmniFlux"
Write-Host "-------------------------------------------------------------"
Write-Host "Installing OmniFlux to $installDir..."
Write-Host "-------------------------------------------------------------"

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

Copy-Item -Path "omniflux", "omniflux.cmd", "runtime.js" -Destination $installDir -Force
Copy-Item -Path "stdlib", "assets" -Destination $installDir -Recurse -Force

# Add installDir to User PATH environment variable if not already present
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($path -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$path;$installDir", "User")
    Write-Host "Added $installDir to your User PATH environment variable."
}

Write-Host "OmniFlux installed successfully!"
Write-Host "Please restart your open terminal windows or IDE for changes to take effect."
Write-Host "-------------------------------------------------------------"
EOF

# Create zip archive for Windows
if command -v zip >/dev/null 2>&1; then
    zip -q -r omniflux-windows.zip "$BUILD_WINDOWS"/*
    rm -rf "$BUILD_WINDOWS"
    echo "Created omniflux-windows.zip"
else
    echo "Warning: 'zip' command not found. Leaving Windows build files in $BUILD_WINDOWS directory."
fi

echo "All release packages built successfully!"
