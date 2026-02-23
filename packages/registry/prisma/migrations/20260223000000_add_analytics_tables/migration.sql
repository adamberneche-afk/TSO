-- Analytics Tables for SDK Integration & CTO Agent Tracking

-- SDK Analytics Events
CREATE TABLE IF NOT EXISTS "sdk_analytics_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(255) NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "wallet_address" VARCHAR(255),
    "session_id" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "duration" INTEGER,
    "error_type" VARCHAR(255),
    "error_message" TEXT,
    "ip_address" VARCHAR(255),
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "sdk_analytics_events_event_type_idx" ON "sdk_analytics_events" ("event_type");
CREATE INDEX IF NOT EXISTS "sdk_analytics_events_wallet_address_idx" ON "sdk_analytics_events" ("wallet_address");
CREATE INDEX IF NOT EXISTS "sdk_analytics_events_session_id_idx" ON "sdk_analytics_events" ("session_id");
CREATE INDEX IF NOT EXISTS "sdk_analytics_events_source_idx" ON "sdk_analytics_events" ("source");
CREATE INDEX IF NOT EXISTS "sdk_analytics_events_created_at_idx" ON "sdk_analytics_events" ("created_at");

-- CTO Agent Projects
CREATE TABLE IF NOT EXISTS "cto_agent_projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "wallet_address" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "current_phase" VARCHAR(255) DEFAULT 'planning',
    "pain_points" JSONB DEFAULT '[]',
    "blockers" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "completed_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "cto_agent_projects_wallet_address_idx" ON "cto_agent_projects" ("wallet_address");
CREATE INDEX IF NOT EXISTS "cto_agent_projects_current_phase_idx" ON "cto_agent_projects" ("current_phase");
CREATE INDEX IF NOT EXISTS "cto_agent_projects_created_at_idx" ON "cto_agent_projects" ("created_at");

-- Weekly Insights Reports
CREATE TABLE IF NOT EXISTS "weekly_insights_reports" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "week_start" TIMESTAMP WITH TIME ZONE NOT NULL,
    "week_end" TIMESTAMP WITH TIME ZONE NOT NULL,
    "report_data" JSONB NOT NULL,
    "sessions_started" INTEGER DEFAULT 0,
    "sessions_completed" INTEGER DEFAULT 0,
    "errors_encountered" INTEGER DEFAULT 0,
    "top_pain_points" JSONB DEFAULT '[]',
    "top_errors" JSONB DEFAULT '[]',
    "suggestions" JSONB DEFAULT '[]',
    "email_status" VARCHAR(50) DEFAULT 'pending',
    "generated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "sent_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "weekly_insights_reports_week_start_idx" ON "weekly_insights_reports" ("week_start");
CREATE INDEX IF NOT EXISTS "weekly_insights_reports_email_status_idx" ON "weekly_insights_reports" ("email_status");
