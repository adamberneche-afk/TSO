#!/bin/bash
# Start script for dual-database architecture
# Handles dependencies, build, migrations, and server startup

set -e

echo "=========================================="
echo "TAIS Platform - Startup Script"
echo "=========================================="

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

# Generate Prisma client (required before building)
echo ""
echo "Generating Prisma client..."
npx prisma generate

# Build if dist/ doesn't exist
if [ ! -d "dist" ]; then
    echo ""
    echo "Building TypeScript..."
    npm run build
fi

# Show database configuration
echo ""
echo "Database Configuration:"
echo "  RAG_DATABASE_URL set: $([ -n "$RAG_DATABASE_URL" ] && echo "YES" || echo "NO")"
echo "  SKILLS_DATABASE_URL set: $([ -n "$SKILLS_DATABASE_URL" ] && echo "YES" || echo "NO")"
echo "  DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo "YES" || echo "NO")"

# Run migrations on RAG database if configured
if [ -n "$RAG_DATABASE_URL" ]; then
    echo ""
    echo "Running migrations on RAG database..."
    export DATABASE_URL="$RAG_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Run migrations on Skills database if configured
if [ -n "$SKILLS_DATABASE_URL" ]; then
    echo ""
    echo "Running migrations on Skills database..."
    export DATABASE_URL="$SKILLS_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Legacy: single database mode
if [ -z "$RAG_DATABASE_URL" ] && [ -z "$SKILLS_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    echo ""
    echo "Running migrations (single database mode)..."
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Start the server
echo ""
echo "=========================================="
echo "Starting server..."
echo "=========================================="
exec node dist/index.js
