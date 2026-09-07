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

# Always put the root package.json back, even if a later step fails and
# `set -e` aborts the script early. Without this, any failure between
# here and the (now real, no-longer-swallowed) migration/seed steps below
# leaves the entire monorepo's root package.json renamed to
# package.json.bak -- breaking npm workspace resolution for every other
# package until someone notices and renames it back by hand.
restore_root_package_json() {
    if [ -f "$ROOT_DIR/package.json.bak" ]; then
        echo "Restoring workspace configuration..."
        mv "$ROOT_DIR/package.json.bak" "$ROOT_DIR/package.json"
    fi
}
trap restore_root_package_json EXIT

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

#
# Note: `prisma migrate deploy` is itself idempotent -- it only applies
# migrations that haven't been applied yet and exits 0 if there's
# nothing pending. It does NOT fail for "already applied" migrations,
# so a non-zero exit here always means a real problem (a bad migration,
# a lost DB connection, drift, a failed migration state, a checksum
# mismatch, ...). Swallowing that with `|| echo` let the build carry on
# and deploy a server against a database that may be missing schema it
# needs, silently, with the only trace being a misleadingly reassuring
# log line. Likewise prisma/seed.ts already checks for existing data
# and exits 0 on its own when the database has already been seeded, so
# a non-zero exit from `prisma db seed` is a genuine failure too. With
# `set -e` already active, letting these commands fail naturally is
# exactly what turns a real failure into a failed build instead of a
# broken deploy.

if [ -n "$RAG_DATABASE_URL" ]; then
    echo "Running migrations on RAG database (tais-rag)..."
    echo "  URL starts with: ${RAG_DATABASE_URL:0:20}..."
    export DATABASE_URL="$RAG_DATABASE_URL"
    npx prisma migrate deploy
fi

if [ -n "$SKILLS_DATABASE_URL" ]; then
    echo "Running migrations on Skills database (tais_registry)..."
    echo "  URL starts with: ${SKILLS_DATABASE_URL:0:20}..."
    export DATABASE_URL="$SKILLS_DATABASE_URL"
    npx prisma migrate deploy
fi

# Legacy: single database mode
if [ -z "$RAG_DATABASE_URL" ] && [ -z "$SKILLS_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations (single database mode)..."
    npx prisma migrate deploy
fi

# Seed database (optional, only if SEED_DATABASE is set to true)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "Seeding database..."
    npx prisma db seed
fi

# Root package.json restoration is handled by the trap above, on every
# exit path (success or failure).

echo "Build complete!"
