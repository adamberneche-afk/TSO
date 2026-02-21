-- Migration Fix: Mark failed migration as applied and run data migration
-- Run this against both databases (tais-rag and tais_registry)

-- Step 1: Mark the failed migration as applied
-- This tells Prisma the migration ran successfully
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT 
    gen_random_uuid(),
    'manual_fix',
    NOW(),
    '20260220000001_migrate_personality_data',
    'Manual fix - marking as applied',
    NULL,
    NOW(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260220000001_migrate_personality_data'
);

-- Step 2: Ensure columns exist (from 20260220000000_add_personality_fields)
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS personality_md TEXT;
ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS personality_version INTEGER NOT NULL DEFAULT 1;

-- Step 3: Populate personalityMd for any existing configs that don't have it
UPDATE agent_configurations
SET 
    personality_md = format(
'# Agent

## Identity
You are an AI assistant designed to help users effectively.

## Communication Style
- **Tone:** %s
- **Detail Level:** %s
- **Formality:** %s

## Response Guidelines
1. Be helpful and accurate
2. Ask clarifying questions when needed
3. Provide actionable suggestions
4. Acknowledge limitations when appropriate

## Domain Knowledge
- General purpose assistance
- Adapts to user needs and context
',
        CASE COALESCE(config_data->'agent'->'personality'->>'tone', 'balanced')
            WHEN 'direct' THEN 'Get to the point quickly. Avoid unnecessary explanations.'
            WHEN 'conversational' THEN 'Be friendly and engaging. Provide context and examples.'
            ELSE 'Provide clear explanations with appropriate detail.'
        END,
        CASE COALESCE(config_data->'agent'->'personality'->>'verbosity', 'balanced')
            WHEN 'brief' THEN 'Keep responses concise. Focus on essential information only.'
            WHEN 'detailed' THEN 'Provide comprehensive explanations with full context and examples.'
            ELSE 'Provide moderate detail with key context.'
        END,
        CASE COALESCE(config_data->'agent'->'personality'->>'formality', 'balanced')
            WHEN 'casual' THEN 'Use relaxed, friendly language. Informal tone is acceptable.'
            WHEN 'professional' THEN 'Use formal, business-appropriate language.'
            ELSE 'Professional yet approachable. Use industry-standard terminology.'
        END
    ),
    personality_version = 1
WHERE personality_md IS NULL
AND config_data IS NOT NULL;
