#!/bin/bash
# RCRT Native macOS Installer (No Dependencies)
# Download, unzip, and run - no Docker or any other software needed

set -e

INSTALL_DIR="$HOME/Library/Application Support/RCRT"
APP_NAME="RCRT"
RELEASE_URL="https://github.com/anomalyco/rcrt/releases/latest/download"
ZIP_URL="$RELEASE_URL/RCRT-macos-x64"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          RCRT - Right Context, Right Time                ║"
echo "║          Native macOS Installer                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check for existing installation
if [ -f "$INSTALL_DIR/RCRT.app/Contents/MacOS/rcrt" ]; then
    echo "RCRT is already installed!"
    echo ""
    read -p "Run RCRT now? (Y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$INSTALL_DIR/RCRT.app"
    fi
    exit 0
fi

# Create installation directory
echo "Creating installation folder..."
mkdir -p "$INSTALL_DIR"

# Try DMG first, fall back to ZIP
echo ""
echo "Downloading RCRT..."
if command -v curl &> /dev/null; then
    curl -L -o "/tmp/rcrt-install.zip" "$ZIP_URL" 2>/dev/null || curl -L -o "/tmp/rcrt-install.dmg" "$DMG_URL" 2>/dev/null
else
    echo "curl not found. Please download manually from:"
    echo "$ZIP_URL"
    exit 1
fi

# Extract
if [ -f "/tmp/rcrt-install.zip" ]; then
    echo "Extracting..."
    unzip -o "/tmp/rcrt-install.zip" -d "$INSTALL_DIR" 2>/dev/null || true
    rm -f "/tmp/rcrt-install.zip"
elif [ -f "/tmp/rcrt-install.dmg" ]; then
    echo "Mounting DMG..."
    hdiutil attach "/tmp/rcrt-install.dmg" -nobrowse 2>/dev/null
    cp -R "/Volumes/RCRT/RCRT.app" "$INSTALL_DIR/" 2>/dev/null || true
    hdiutil detach "/Volumes/RCRT" 2>/dev/null || true
    rm -f "/tmp/rcrt-install.dmg"
fi

# Make executable
if [ -f "$INSTALL_DIR/rcrt" ]; then
    chmod +x "$INSTALL_DIR/rcrt"
fi

echo ""
echo "✓ RCRT installed to: $INSTALL_DIR"

# Create Applications symlink
if [ ! -L "$HOME/Applications/RCRT.app" ]; then
    mkdir -p "$HOME/Applications"
    ln -sf "$INSTALL_DIR/RCRT.app" "$HOME/Applications/RCRT.app"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 Installation Complete!                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "RCRT is now installed and ready to use!"
echo ""
echo "To run RCRT:"
echo "  • Double-click RCRT in Finder > Applications"
echo "  • Or run: open '$INSTALL_DIR/RCRT.app'"
echo ""
echo "RCRT will run in the background and connect to TAIS."
echo ""

# Ask to launch
read -p "Launch RCRT now? (Y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$INSTALL_DIR/RCRT.app" 2>/dev/null || open "$INSTALL_DIR"
fi
