#!/bin/bash
set -e

echo "Building OmniFlux Debian Package..."

# Create temporary directory inside the workspace (since we cannot use /tmp per user rules)
BUILD_DIR="./deb_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/local/bin"
mkdir -p "$BUILD_DIR/usr/local/share/omniflux"
mkdir -p "$BUILD_DIR/usr/share/omniflux/extensions"

# 1. Create control file
cat << 'EOF' > "$BUILD_DIR/DEBIAN/control"
Package: omniflux
Version: 1.0.0
Section: devel
Priority: optional
Architecture: all
Depends: nodejs (>= 16.0.0)
Maintainer: Ori Kuttner <ori@helicontech.co.il>
Description: OmniFlux minimalist backend language compiler and VS Code support.
EOF

# 2. Copy the native compiler binary and standard runtime
cp ./compiler/omniflux "$BUILD_DIR/usr/local/bin/omniflux"
chmod +x "$BUILD_DIR/usr/local/bin/omniflux"

# Copy runtime.js to /usr/local/share/omniflux/OmniFlux/runtime.js
mkdir -p "$BUILD_DIR/usr/local/share/omniflux/OmniFlux"
cp ./OmniFlux/runtime.js "$BUILD_DIR/usr/local/share/omniflux/OmniFlux/runtime.js"

# 3. Copy the base prompt
cp ./omniflux.prompt "$BUILD_DIR/usr/local/share/omniflux/omniflux.prompt"

# 4. Copy the VS Code extension
cp -r ./editors/vscode "$BUILD_DIR/usr/share/omniflux/extensions/omniflux-support"

# 5. Create postinst script to help with VS Code/Antigravity extension installation
cat << 'EOF' > "$BUILD_DIR/DEBIAN/postinst"
#!/bin/bash
set -e

# Make sure permissions are correct
chmod +x /usr/local/bin/omniflux

echo "-------------------------------------------------------------"
echo "OmniFlux Compiler installed successfully to /usr/local/bin/omniflux"
echo "-------------------------------------------------------------"
echo "To install the extension for VS Code or Antigravity:"
echo ""
echo "Option 1: Graphical Interface (GUI) via VSIX"
echo "  1. Open your editor (VS Code or Antigravity)."
echo "  2. Open the Extensions sidebar (Ctrl+Shift+X)."
echo "  3. Click the '...' menu at the top-right and select 'Install from VSIX...'."
echo "  4. Choose: /usr/share/omniflux/extensions/omniflux-support/omniflux-support-1.0.0.vsix"
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
chmod +x "$BUILD_DIR/DEBIAN/postinst"

# 6. Build the debian package
dpkg-deb --build "$BUILD_DIR" omniflux.deb

# Clean up build directory
rm -rf "$BUILD_DIR"

echo "Build complete! Created omniflux.deb"
