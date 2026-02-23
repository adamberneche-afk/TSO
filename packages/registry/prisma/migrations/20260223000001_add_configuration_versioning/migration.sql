-- Configuration Versioning Tables

CREATE TABLE IF NOT EXISTS "configuration_versions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "config_id" VARCHAR(255) NOT NULL,
    "wallet_address" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL,
    "version_note" TEXT,
    "config_snapshot" JSONB NOT NULL,
    "personality_md" TEXT,
    "tier" VARCHAR(50) DEFAULT 'bronze',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "expires_at" TIMESTAMP WITH TIME ZONE,
    UNIQUE("config_id", "version")
);

CREATE INDEX IF NOT EXISTS "configuration_versions_wallet_address_idx" ON "configuration_versions" ("wallet_address");
CREATE INDEX IF NOT EXISTS "configuration_versions_config_id_idx" ON "configuration_versions" ("config_id");
CREATE INDEX IF NOT EXISTS "configuration_versions_expires_at_idx" ON "configuration_versions" ("expires_at");
