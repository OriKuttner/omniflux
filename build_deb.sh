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
Depends: perl (>= 5.30.0), libjson-pp-perl
Maintainer: Ori <ori@omniflux.org>
Description: OmniFlux minimalist backend language compiler and VS Code support.
EOF

# 2. Copy the compiler perl script and modules
cp ./omniflux "$BUILD_DIR/usr/local/bin/omniflux"
chmod +x "$BUILD_DIR/usr/local/bin/omniflux"

# Copy the Perl modules to /usr/local/share/omniflux/lib
mkdir -p "$BUILD_DIR/usr/local/share/omniflux/lib/OmniFlux"
cp ./OmniFlux/Config.pm "$BUILD_DIR/usr/local/share/omniflux/lib/OmniFlux/Config.pm"
cp ./OmniFlux/Wizard.pm "$BUILD_DIR/usr/local/share/omniflux/lib/OmniFlux/Wizard.pm"

# 3. Copy the base prompt
cp ./omniflux.prompt "$BUILD_DIR/usr/local/share/omniflux/omniflux.prompt"

# 4. Copy the VS Code extension
cp -r ./editors/vscode "$BUILD_DIR/usr/share/omniflux/extensions/omniflux-support"

# 5. Create postinst script to help with VS Code extension linking/installation
cat << 'EOF' > "$BUILD_DIR/DEBIAN/postinst"
#!/bin/bash
set -e

# Make sure permissions are correct
chmod +x /usr/local/bin/omniflux

echo "-------------------------------------------------------------"
echo "OmniFlux Compiler installed successfully to /usr/local/bin/omniflux"
echo "-------------------------------------------------------------"
echo "To install the VS Code extension for your user, run:"
echo "  mkdir -p ~/.vscode/extensions"
echo "  ln -sf /usr/share/omniflux/extensions/omniflux-support ~/.vscode/extensions/omniflux-support"
echo "Or use VS Code's command line if available:"
echo "  code --install-extension /usr/share/omniflux/extensions/omniflux-support"
echo "-------------------------------------------------------------"
EOF
chmod +x "$BUILD_DIR/DEBIAN/postinst"

# 6. Build the debian package
dpkg-deb --build "$BUILD_DIR" omniflux.deb

# Clean up build directory
rm -rf "$BUILD_DIR"

echo "Build complete! Created omniflux.deb"
