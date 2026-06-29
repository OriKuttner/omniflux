#!/bin/bash
set -e

echo "Building OmniFlux Debian Package..."

# Create temporary directory inside the workspace (since we cannot use /tmp per user rules)
BUILD_DIR="./deb_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/local/bin"
mkdir -p "$BUILD_DIR/usr/local/share/omniflux/compiler"
mkdir -p "$BUILD_DIR/usr/share/omniflux/extensions"

# 1. Extract version from compiler/omniflux.of
VERSION=$(grep '\$VERSION\s*=\s*' compiler/omniflux.of | cut -d'"' -f2 || echo "1.0.1")
if [ -z "$VERSION" ]; then
  VERSION="1.0.1"
fi

# Detect vsix filename dynamically
VSIX_FILE=$(cd editors/vscode && ls *.vsix 2>/dev/null | head -n 1)
if [ -z "$VSIX_FILE" ]; then
  VSIX_FILE="omniflux-support-$VERSION.vsix"
fi

# Create control file (no Depends field to prevent dpkg database conflicts)
cat << EOF > "$BUILD_DIR/DEBIAN/control"
Package: omniflux
Version: $VERSION
Section: devel
Priority: optional
Architecture: all
Maintainer: Ori Kuttner <ori@helicontech.co.il>
Description: OmniFlux minimalist backend language compiler and VS Code support.
EOF

# 2. Copy the compiler script to the shared folder
if [ -f ./compiler/omniflux ]; then
  cp ./compiler/omniflux ./omniflux
fi
cp ./omniflux "$BUILD_DIR/usr/local/share/omniflux/compiler/omniflux"
chmod +x "$BUILD_DIR/usr/local/share/omniflux/compiler/omniflux"

# 3. Create the wrapper script in /usr/local/bin/omniflux
cat << 'EOF' > "$BUILD_DIR/usr/local/bin/omniflux"
#!/bin/bash
# Wrapper script for OmniFlux compiler. Uses private Node.js fallback if system Node is missing/incompatible.
if [ -f /usr/local/share/omniflux/bin/node ]; then
  exec /usr/local/share/omniflux/bin/node /usr/local/share/omniflux/compiler/omniflux "$@"
else
  exec node /usr/local/share/omniflux/compiler/omniflux "$@"
fi
EOF
chmod +x "$BUILD_DIR/usr/local/bin/omniflux"

# 4. Copy runtime.js to /usr/local/share/omniflux/runtime.js
cp ./runtime.js "$BUILD_DIR/usr/local/share/omniflux/runtime.js"

# 5. Copy assets to /usr/local/share/omniflux/assets
mkdir -p "$BUILD_DIR/usr/local/share/omniflux/assets"
cp -r ./assets/* "$BUILD_DIR/usr/local/share/omniflux/assets/"

# 5.5. Copy stdlib to /usr/local/share/omniflux/stdlib
mkdir -p "$BUILD_DIR/usr/local/share/omniflux/stdlib"
cp -r ./stdlib/* "$BUILD_DIR/usr/local/share/omniflux/stdlib/"

# 6. Copy the VS Code extension
cp -r ./editors/vscode "$BUILD_DIR/usr/share/omniflux/extensions/omniflux-support"

# 7. Create postinst script to check/install dependencies at install time
cat << 'EOF' > "$BUILD_DIR/DEBIAN/postinst"
#!/bin/bash
set -e

# Make sure permissions are correct
chmod +x /usr/local/bin/omniflux
chmod +x /usr/local/share/omniflux/compiler/omniflux

# Detect active Node.js version (checking system globally and invoking user's environment)
NODE_VER=""
if [ -n "$SUDO_USER" ]; then
  # Run node -v as the invoking user to detect NVM or user PATH node
  NODE_VER=$(sudo -u "$SUDO_USER" -i node -v 2>/dev/null || sudo -u "$SUDO_USER" node -v 2>/dev/null || true)
fi

if [ -z "$NODE_VER" ]; then
  # Fallback to root's system node
  NODE_VER=$(node -v 2>/dev/null || true)
fi

MAJOR_VER=""
if [ -n "$NODE_VER" ]; then
  CLEAN_VER=${NODE_VER#v}
  MAJOR_VER=${CLEAN_VER%%.*}
fi

echo "OmniFlux Installation Diagnostics:"
echo "  Detected Node.js version in environment: ${NODE_VER:-None}"

# Check if we need to install a local node fallback
if [ -z "$MAJOR_VER" ] || [ "$MAJOR_VER" -lt 16 ]; then
  echo "  No compatible global Node.js version (>= 16) detected."
  echo "  Installing a private portable Node.js runtime fallback..."
  
  # Create local bin directory
  mkdir -p /usr/local/share/omniflux/bin
  
  # Download official portable Node 20 binary
  NODE_URL="https://nodejs.org/dist/v20.19.5/node-v20.19.5-linux-x64.tar.xz"
  TEMP_TAR="/tmp/node-portable.tar.xz"
  
  echo "  Downloading portable Node.js from $NODE_URL..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$NODE_URL" -o "$TEMP_TAR"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$TEMP_TAR" "$NODE_URL"
  else
    echo "  Error: Neither curl nor wget is installed on this system. Cannot download Node.js fallback."
    exit 1
  fi
  
  echo "  Extracting node binary..."
  tar -xf "$TEMP_TAR" -C /usr/local/share/omniflux/bin --strip-components=2 "node-v20.19.5-linux-x64/bin/node"
  rm -f "$TEMP_TAR"
  
  chmod +x /usr/local/share/omniflux/bin/node
  echo "  Private Node.js fallback installed successfully."
else
  # A compatible Node.js is present. Clean up any previous fallback just in case
  if [ -f /usr/local/share/omniflux/bin/node ]; then
    rm -f /usr/local/share/omniflux/bin/node
  fi
  echo "  Compatible Node.js version found. Using system-wide node."
fi

echo "-------------------------------------------------------------"
echo "OmniFlux Compiler installed successfully to /usr/local/bin/omniflux"
echo "-------------------------------------------------------------"
echo "To install the extension for VS Code or Antigravity:"
echo ""
echo "Option 1: Graphical Interface (GUI) via VSIX"
echo "  1. Open your editor (VS Code or Antigravity)."
echo "  2. Open the Extensions sidebar (Ctrl+Shift+X)."
echo "  3. Click the '...' menu at the top-right and select 'Install from VSIX...'."
echo "  4. Choose: /usr/share/omniflux/extensions/omniflux-support/@VSIX_FILE@"
echo ""
echo "Option 2: Command Line (CLI)"
echo "  * For VS Code:"
echo "      code --install-extension /usr/share/omniflux/extensions/omniflux-support"
echo "  * For Antigravity:"
echo "      antigravity --install-extension /usr/share/omniflux/extensions/omniflux-support"
echo ""
echo "Option 3: Manual Directory Linking"
echo "  * For VS Code:"
echo "      mkdir -p ~/.vscode/extensions"
echo "      ln -sf /usr/share/omniflux/extensions/omniflux-support ~/.vscode/extensions/omniflux-support"
echo "  * For Antigravity:"
echo "      mkdir -p ~/.antigravity/extensions"
echo "      ln -sf /usr/share/omniflux/extensions/omniflux-support ~/.antigravity/extensions/omniflux-support"
echo "-------------------------------------------------------------"
EOF
sed -i "s/@VSIX_FILE@/$VSIX_FILE/g" "$BUILD_DIR/DEBIAN/postinst"
chmod +x "$BUILD_DIR/DEBIAN/postinst"

# 8. Create postrm script to clean up untracked dynamic files on removal
cat << 'EOF' > "$BUILD_DIR/DEBIAN/postrm"
#!/bin/bash
set -e

# If the package is being removed or purged, delete the shared folder and its contents
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
  echo "Removing OmniFlux shared files and fallbacks..."
  rm -rf /usr/local/share/omniflux
fi
EOF
chmod +x "$BUILD_DIR/DEBIAN/postrm"

# 9. Build the debian package
dpkg-deb --build "$BUILD_DIR" omniflux.deb

# Clean up build directory
rm -rf "$BUILD_DIR"

echo "Build complete! Created omniflux.deb"
