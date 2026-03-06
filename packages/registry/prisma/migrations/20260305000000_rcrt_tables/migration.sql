-- RCRT Integration Tables
-- Migration: 20260305000000_rcrt_tables

-- Create RCRTAgent table
CREATE TABLE IF NOT EXISTS "RCRTAgent" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "agentId" TEXT UNIQUE NOT NULL,
    "ownerId" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    "lastSeen" TIMESTAMP WITH TIME ZONE,
    "provisionedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rcrt_agent_owner ON "RCRTAgent"("ownerId");
CREATE INDEX IF NOT EXISTS idx_rcrt_agent_status ON "RCRTAgent"(status);

-- Create KBRegistry table
CREATE TABLE IF NOT EXISTS "KBRegistry" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "kbId" TEXT UNIQUE NOT NULL,
    "ownerId" TEXT NOT NULL,
    "appId" TEXT,
    "contextType" TEXT NOT NULL DEFAULT 'public',
    "attachedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "excludedFromRCRT" BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_kb_registry_owner ON "KBRegistry"("ownerId");
CREATE INDEX IF NOT EXISTS idx_kb_registry_kb ON "KBRegistry"("kbId");

-- Create KBAccessHistory table
CREATE TABLE IF NOT EXISTS "KBAccessHistory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "kbId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL,
    "grantedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "revokedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_kb_access_kb ON "KBAccessHistory"("kbId");
CREATE INDEX IF NOT EXISTS idx_kb_access_app ON "KBAccessHistory"("appId");

-- Create ConfidentialGrant table
CREATE TABLE IF NOT EXISTS "ConfidentialGrant" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ownerId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "revokedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_confidential_grant_owner ON "ConfidentialGrant"("ownerId");
CREATE INDEX IF NOT EXISTS idx_confidential_grant_app ON "ConfidentialGrant"("appId");

-- Create RoutingLog table
CREATE TABLE IF NOT EXISTS "RoutingLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "breadcrumbId" TEXT NOT NULL,
    "targetAppId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_log_breadcrumb ON "RoutingLog"("breadcrumbId");
CREATE INDEX IF NOT EXISTS idx_routing_log_app ON "RoutingLog"("targetAppId");
CREATE INDEX IF NOT EXISTS idx_routing_log_timestamp ON "RoutingLog"("timestamp");

-- Create ContextType enum if not exists
DO $$ BEGIN
    CREATE TYPE context_type AS ENUM ('private', 'confidential', 'shared', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add contextType to KBRegistry if not exists
ALTER TABLE "KBRegistry" 
ALTER COLUMN "contextType" TYPE TEXT USING "contextType"::TEXT;
