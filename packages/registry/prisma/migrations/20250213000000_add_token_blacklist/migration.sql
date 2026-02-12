-- Migration: Add TokenBlacklist table for JWT logout functionality
-- Created: February 12, 2026
-- Purpose: Support token revocation on logout

CREATE TABLE IF NOT EXISTS "token_blacklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_blacklist_token_hash_key" UNIQUE ("token_hash")
);

-- Create indexes for performance
CREATE INDEX "token_blacklist_token_hash_idx" ON "token_blacklist"("token_hash");
CREATE INDEX "token_blacklist_wallet_address_idx" ON "token_blacklist"("wallet_address");

-- Add comment for documentation
COMMENT ON TABLE "token_blacklist" IS 'Stores revoked JWT tokens for logout functionality. Tokens are hashed (SHA-256) before storage.';
