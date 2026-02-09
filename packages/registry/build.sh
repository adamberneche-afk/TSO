#!/bin/bash
# Build script that works around workspace detection by temporarily renaming root package.json

set -e

# Get the registry directory
REGISTRY_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$REGISTRY_DIR/../.." && pwd)"

echo "Registry directory: $REGISTRY_DIR"
echo "Root directory: $ROOT_DIR"

# Temporarily rename root package.json to prevent workspace detection
if [ -f "$ROOT_DIR/package.json" ]; then
    echo "Temporarily disabling workspace detection..."
    mv "$ROOT_DIR/package.json" "$ROOT_DIR/package.json.bak"
fi

# Change to registry directory
cd "$REGISTRY_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Restore root package.json
if [ -f "$ROOT_DIR/package.json.bak" ]; then
    echo "Restoring workspace configuration..."
    mv "$ROOT_DIR/package.json.bak" "$ROOT_DIR/package.json"
fi

echo "Build complete!"
