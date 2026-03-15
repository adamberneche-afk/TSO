#!/bin/bash

echo "============================================"
echo "RCRT Installer - macOS Native"
echo "============================================"
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "ERROR: Rust is not installed"
    echo "Please install Rust from: https://rustup.rs"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Building RCRT..."
cargo build --release -p rcrt-standalone
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[2/3] Installing binary..."
mkdir -p "$HOME/RCRT"
cp target/release/rcrt-standalone "$HOME/RCRT/RCRT"
chmod +x "$HOME/RCRT/RCRT"

echo "[3/3] Adding to PATH..."
# Add to shell profile if not already there
RCRT_PATH_LINE='export PATH="$HOME/RCRT:$PATH"'
if ! grep -q "$HOME/RCRT" ~/.bash_profile 2>/dev/null; then
    echo "$RCRT_PATH_LINE" >> ~/.bash_profile
fi
if ! grep -q "$HOME/RCRT" ~/.zshenv 2>/dev/null; then
    echo "$RCRT_PATH_LINE" >> ~/.zshenv
fi

echo ""
echo "============================================"
echo "Installation Complete!"
echo "============================================"
echo ""
echo "RCRT has been installed to: $HOME/RCRT/RCRT"
echo ""
echo "To run RCRT:"
echo "   1. Open a new terminal"
echo "   2. Run: $HOME/RCRT/RCRT"
echo "   3. Or simply: rcrt"
echo ""
echo "RCRT will start on http://localhost:8090"
echo ""
echo "NOTE: Run 'source ~/.bash_profile' or 'source ~/.zshenv' to use 'rcrt' command"
echo ""
read -p "Press Enter to continue..."
