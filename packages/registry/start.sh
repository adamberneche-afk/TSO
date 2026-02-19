#!/bin/bash
# Start script - assumes build already completed
# Only handles migrations and server startup

set -e

echo "=========================================="
echo "TAIS Platform - Starting Server"
echo "=========================================="

# Run migrations on RAG database if configured
if [ -n "$RAG_DATABASE_URL" ]; then
    echo "Running migrations on RAG database..."
    export DATABASE_URL="$RAG_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Run migrations on Skills database if configured
if [ -n "$SKILLS_DATABASE_URL" ]; then
    echo "Running migrations on Skills database..."
    export DATABASE_URL="$SKILLS_DATABASE_URL"
    npx prisma migrate deploy || echo "Migration may have already been applied"
fi

# Start the server
echo ""
echo "=========================================="
echo "Server starting on port ${PORT:-3000}"
echo "=========================================="
exec node dist/index.js
