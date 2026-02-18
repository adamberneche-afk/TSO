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

# Run database migrations
# Support dual-database architecture: RAG_DATABASE_URL and SKILLS_DATABASE_URL

# Debug: Show what environment variables are set (without showing full URLs)
echo "Database environment variables:"
echo "  RAG_DATABASE_URL set: $([ -n "$RAG_DATABASE_URL" ] && echo "YES" || echo "NO")"
echo "  SKILLS_DATABASE_URL set: $([ -n "$SKILLS_DATABASE_URL" ] && echo "YES" || echo "NO")"

if [ -n "$RAG_DATABASE_URL" ]; then
    echo "Running migrations on RAG database (tais-rag)..."
    echo "  URL starts with: ${RAG_DATABASE_URL:0:20}..."
    export DATABASE_URL="$RAG_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

if [ -n "$SKILLS_DATABASE_URL" ]; then
    echo "Running migrations on Skills database (tais_registry)..."
    echo "  URL starts with: ${SKILLS_DATABASE_URL:0:20}..."
    export DATABASE_URL="$SKILLS_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Legacy: single database mode
if [ -z "$RAG_DATABASE_URL" ] && [ -z "$SKILLS_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations (single database mode)..."
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Seed database (optional, only if SEED_DATABASE is set to true)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "Seeding database..."
    npx prisma db seed || echo "Seed may have already been run"
fi

# Restore root package.json
if [ -f "$ROOT_DIR/package.json.bak" ]; then
    echo "Restoring workspace configuration..."
    mv "$ROOT_DIR/package.json.bak" "$ROOT_DIR/package.json"
fi

echo "Build complete!"
