#!/bin/bash

echo "============================================"
echo "RCRT Installer - Linux Native"
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
mkdir -p "$HOME/.rcrt"
cp target/release/rcrt-standalone "$HOME/.rcrt/rcrt"
chmod +x "$HOME/.rcrt/rcrt"

echo "[3/3] Creating launcher..."
# Create launcher script
cat > "$HOME/.local/bin/rcrt" << 'EOF'
#!/bin/bash
exec "$HOME/.rcrt/rcrt" "$@"
EOF
chmod +x "$HOME/.local/bin/rcrt"

echo ""
echo "============================================"
echo "Installation Complete!"
echo "============================================"
echo ""
echo "RCRT has been installed to: $HOME/.rcrt/rcrt"
echo ""
echo "To run RCRT:"
echo "   1. Run: $HOME/.rcrt/rcrt"
echo "   2. Or: rcrt (if ~/.local/bin is in PATH)"
echo ""
echo "RCRT will start on http://localhost:8090"
echo ""
read -p "Press Enter to continue..."
