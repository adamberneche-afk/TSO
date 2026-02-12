-- BLOCKER-1 FIX: Migration to add AuthNonce table and update ApiKey table

-- Create AuthNonce table for replay attack prevention
CREATE TABLE IF NOT EXISTS "auth_nonces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

-- Create indexes for AuthNonce
CREATE INDEX IF NOT EXISTS "auth_nonces_wallet_address_idx" ON "auth_nonces"("wallet_address");
CREATE INDEX IF NOT EXISTS "auth_nonces_nonce_idx" ON "auth_nonces"("nonce");

-- Migration: Update ApiKey table structure
-- Note: This is a breaking change - old ApiKey data will be lost
-- In production, you should migrate data instead of dropping

-- Drop old ApiKey table (if exists with old structure)
DROP TABLE IF EXISTS "api_keys";

-- Create new ApiKey table with correct structure
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key_hash" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "rate_limit" INTEGER NOT NULL DEFAULT 1000,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash")
);

-- Create indexes for ApiKey
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_wallet_address_idx" ON "api_keys"("wallet_address");

-- Add comment explaining the migration
COMMENT ON TABLE "api_keys" IS 'API keys for programmatic access. key_hash is SHA-256 of the actual key.';
COMMENT ON TABLE "auth_nonces" IS 'Temporary nonces for signature-based authentication. Auto-expire after 5 minutes.';
