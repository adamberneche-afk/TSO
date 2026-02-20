-- Migration: Populate personalityMd for existing configurations
-- Converts personality enums to default markdown templates
-- Run after: 20260220000000_add_personality_fields

-- Function to map personality combinations to markdown
-- This is a best-effort migration that sets a default personality.md
-- based on the personality enum values in configData

-- Update existing configurations that have personality but no personalityMd
-- We use a simple default since we can't easily extract full goals from configData

DO $$
DECLARE
    config_record RECORD;
    personality_json JSONB;
    tone_val TEXT;
    verbosity_val TEXT;
    formality_val TEXT;
    personality_md TEXT;
BEGIN
    FOR config_record IN 
        SELECT id, config_data 
        FROM agent_configurations 
        WHERE personality_md IS NULL 
        AND config_data IS NOT NULL
    LOOP
        -- Extract personality from configData
        personality_json := config_record.config_data->'agent'->'personality';
        
        IF personality_json IS NOT NULL THEN
            tone_val := COALESCE(personality_json->>'tone', 'balanced');
            verbosity_val := COALESCE(personality_json->>'verbosity', 'balanced');
            formality_val := COALESCE(personality_json->>'formality', 'balanced');
            
            -- Generate personality markdown based on enum values
            personality_md := format(
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
                CASE tone_val
                    WHEN 'direct' THEN 'Get to the point quickly. Avoid unnecessary explanations.'
                    WHEN 'conversational' THEN 'Be friendly and engaging. Provide context and examples.'
                    ELSE 'Provide clear explanations with appropriate detail.'
                END,
                CASE verbosity_val
                    WHEN 'brief' THEN 'Keep responses concise. Focus on essential information only.'
                    WHEN 'detailed' THEN 'Provide comprehensive explanations with full context and examples.'
                    ELSE 'Provide moderate detail with key context.'
                END,
                CASE formality_val
                    WHEN 'casual' THEN 'Use relaxed, friendly language. Informal tone is acceptable.'
                    WHEN 'professional' THEN 'Use formal, business-appropriate language.'
                    ELSE 'Professional yet approachable. Use industry-standard terminology.'
                END
            );
            
            -- Update the record
            UPDATE agent_configurations
            SET personality_md = personality_md,
                personality_version = 1
            WHERE id = config_record.id;
            
            RAISE NOTICE 'Migrated configuration %', config_record.id;
        END IF;
    END LOOP;
END $$;

-- Add comment documenting the migration
COMMENT ON COLUMN "agent_configurations"."personality_md" IS 'Markdown personality configuration. Migrated from personality enums on 2026-02-20.';
