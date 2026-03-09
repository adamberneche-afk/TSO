#!/bin/bash
# RCRT Native Linux Installer (No Dependencies)
# Download, extract, and run - no Docker or any other software needed

set -e

INSTALL_DIR="$HOME/.local/rcrt"
RELEASE_URL="https://github.com/anomalyco/rcrt/releases/latest/download"
TAR_URL="$RELEASE_URL/RCRT-linux-x64"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          RCRT - Right Context, Right Time                ║"
echo "║          Native Linux Installer                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check for existing installation
if [ -f "$INSTALL_DIR/rcrt" ]; then
    echo "RCRT is already installed!"
    echo ""
    read -p "Run RCRT now? (Y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$INSTALL_DIR/rcrt" &
        exit 0
    fi
fi

# Create installation directory
echo "Creating installation folder..."
mkdir -p "$INSTALL_DIR"

# Download
echo ""
echo "Downloading RCRT..."
if command -v wget &> /dev/null; then
    wget -q -O "/tmp/rcrt-install.tar.gz" "$TAR_URL" 2>/dev/null || wget -q -O "/tmp/rcrt-install.AppImage" "$APPIMAGE_URL" 2>/dev/null
elif command -v curl &> /dev/null; then
    curl -L -s -o "/tmp/rcrt-install.tar.gz" "$TAR_URL" 2>/dev/null || curl -L -s -o "/tmp/rcrt-install.AppImage" "$APPIMAGE_URL" 2>/dev/null
else
    echo "Neither wget nor curl found. Please download manually from:"
    echo "$TAR_URL"
    exit 1
fi

# Extract
if [ -f "/tmp/rcrt-install.tar.gz" ]; then
    echo "Extracting..."
    tar -xzf "/tmp/rcrt-install.tar.gz" -C "$INSTALL_DIR" 2>/dev/null || true
    rm -f "/tmp/rcrt-install.tar.gz"
elif [ -f "/tmp/rcrt-install.AppImage" ]; then
    mv "/tmp/rcrt-install.AppImage" "$INSTALL_DIR/rcrt"
fi

# Make executable
if [ -f "$INSTALL_DIR/rcrt" ]; then
    chmod +x "$INSTALL_DIR/rcrt"
fi

# Create symlink in PATH
if [ ! -f "$HOME/.local/bin/rcrt" ]; then
    mkdir -p "$HOME/.local/bin"
    ln -sf "$INSTALL_DIR/rcrt" "$HOME/.local/bin/rcrt"
fi

echo ""
echo "✓ RCRT installed to: $INSTALL_DIR"

# Add to desktop (if available)
if command -v gtk-launch &> /dev/null; then
    # Try to create a .desktop file
    mkdir -p "$HOME/.local/share/applications"
    cat > "$HOME/.local/share/applications/rcrt.desktop" << EOF
[Desktop Entry]
Name=RCRT
Comment=Right Context, Right Time - Local AI Context
Exec=$INSTALL_DIR/rcrt
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Utility;AI;
EOF
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 Installation Complete!                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "RCRT is now installed and ready to use!"
echo ""
echo "To run RCRT:"
echo "  • Run: rcrt"
echo "  • Or: $INSTALL_DIR/rcrt"
echo ""
echo "RCRT will run in the background and connect to TAIS."
echo ""

# Ask to launch
read -p "Launch RCRT now? (Y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    "$INSTALL_DIR/rcrt" &
fi
