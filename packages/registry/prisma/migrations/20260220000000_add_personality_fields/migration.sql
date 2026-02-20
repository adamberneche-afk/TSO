-- Add personality markdown fields to agent_configurations table
-- Migration for hybrid JSON + Markdown personality configuration (v2.7.0)

-- Add personality_md column (nullable text for markdown personality)
ALTER TABLE "agent_configurations" ADD COLUMN "personality_md" TEXT;

-- Add personality_version column (integer for version tracking, default 1)
ALTER TABLE "agent_configurations" ADD COLUMN "personality_version" INTEGER NOT NULL DEFAULT 1;

-- Create index on personality_version for efficient queries
CREATE INDEX "agent_configurations_personality_version_idx" ON "agent_configurations"("personality_version");

-- Comment on columns for documentation
COMMENT ON COLUMN "agent_configurations"."personality_md" IS 'Markdown personality configuration (flexible, LLM-friendly)';
COMMENT ON COLUMN "agent_configurations"."personality_version" IS 'Version number for personality cache invalidation';
