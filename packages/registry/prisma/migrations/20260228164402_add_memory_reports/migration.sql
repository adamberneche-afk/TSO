/*
  Warnings:

  - The primary key for the `api_keys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `auth_nonces` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `configuration_versions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `cto_agent_projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pain_points` on the `cto_agent_projects` table. All the data in the column will be lost.
  - You are about to drop the column `public_key` on the `rag_public_keys` table. All the data in the column will be lost.
  - The primary key for the `sdk_analytics_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `token_blacklist` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `weekly_insights_reports` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[wallet_address,nonce]` on the table `auth_nonces` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicKey]` on the table `rag_public_keys` will be added. If there are existing duplicate values, this will fail.
  - Made the column `tier` on table `configuration_versions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `configuration_versions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `current_phase` on table `cto_agent_projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `blockers` on table `cto_agent_projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `cto_agent_projects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `cto_agent_projects` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `publicKey` to the `rag_public_keys` table without a default value. This is not possible if the table is not empty.
  - Made the column `metadata` on table `sdk_analytics_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `sdk_analytics_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sessions_started` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sessions_completed` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `errors_encountered` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `top_pain_points` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `top_errors` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `suggestions` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email_status` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.
  - Made the column `generated_at` on table `weekly_insights_reports` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AppTier" AS ENUM ('BASIC', 'VERIFIED', 'CERTIFIED');

-- CreateEnum
CREATE TYPE "MemoryEntryType" AS ENUM ('PREFERENCE', 'ACTION', 'FACT', 'CONVERSATION');

-- DropIndex
DROP INDEX "agent_configurations_personality_version_idx";

-- DropIndex
DROP INDEX "rag_public_keys_public_key_idx";

-- DropIndex
DROP INDEX "rag_public_keys_public_key_key";

-- AlterTable
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_nonces" DROP CONSTRAINT "auth_nonces_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "configuration_versions" DROP CONSTRAINT "configuration_versions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "config_id" SET DATA TYPE TEXT,
ALTER COLUMN "wallet_address" SET DATA TYPE TEXT,
ALTER COLUMN "tier" SET NOT NULL,
ALTER COLUMN "tier" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "configuration_versions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "cto_agent_projects" DROP CONSTRAINT "cto_agent_projects_pkey",
DROP COLUMN "pain_points",
ADD COLUMN     "painPoints" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "wallet_address" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "current_phase" SET NOT NULL,
ALTER COLUMN "current_phase" SET DATA TYPE TEXT,
ALTER COLUMN "blockers" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "cto_agent_projects_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rag_public_keys" DROP COLUMN "public_key",
ADD COLUMN     "publicKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sdk_analytics_events" DROP CONSTRAINT "sdk_analytics_events_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ALTER COLUMN "source" SET DATA TYPE TEXT,
ALTER COLUMN "wallet_address" SET DATA TYPE TEXT,
ALTER COLUMN "session_id" SET DATA TYPE TEXT,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "metadata" DROP DEFAULT,
ALTER COLUMN "error_type" SET DATA TYPE TEXT,
ALTER COLUMN "ip_address" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "sdk_analytics_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "token_blacklist" DROP CONSTRAINT "token_blacklist_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "weekly_insights_reports" DROP CONSTRAINT "weekly_insights_reports_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "week_start" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "week_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sessions_started" SET NOT NULL,
ALTER COLUMN "sessions_completed" SET NOT NULL,
ALTER COLUMN "errors_encountered" SET NOT NULL,
ALTER COLUMN "top_pain_points" SET NOT NULL,
ALTER COLUMN "top_errors" SET NOT NULL,
ALTER COLUMN "suggestions" SET NOT NULL,
ALTER COLUMN "email_status" SET NOT NULL,
ALTER COLUMN "email_status" SET DATA TYPE TEXT,
ALTER COLUMN "generated_at" SET NOT NULL,
ALTER COLUMN "generated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "weekly_insights_reports_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "ApiTier";

-- CreateTable
CREATE TABLE "guided_discovery_sessions" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "responses" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "guided_discovery_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_report_preferences" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "report_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "include_drift_stats" BOOLEAN NOT NULL DEFAULT true,
    "include_usage_patterns" BOOLEAN NOT NULL DEFAULT true,
    "include_app_usage" BOOLEAN NOT NULL DEFAULT true,
    "include_rag_pools" BOOLEAN NOT NULL DEFAULT true,
    "include_alignment_index" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_flag" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_drift" BOOLEAN NOT NULL DEFAULT true,
    "last_report_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_report_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_reports" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "alignment_index" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "drift_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "drift_events" INTEGER NOT NULL DEFAULT 0,
    "drift_trend" TEXT NOT NULL DEFAULT 'stable',
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "avg_session_duration" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "messages_exchanged" INTEGER NOT NULL DEFAULT 0,
    "app_usage" JSONB NOT NULL DEFAULT '{}',
    "rag_queries" INTEGER NOT NULL DEFAULT 0,
    "rag_pool_usage" JSONB NOT NULL DEFAULT '{}',
    "memories_created" INTEGER NOT NULL DEFAULT 0,
    "memories_promoted" INTEGER NOT NULL DEFAULT 0,
    "core_memories" INTEGER NOT NULL DEFAULT 0,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "flag_severity" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_report_aggregates" (
    "id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_users" INTEGER NOT NULL DEFAULT 0,
    "avg_alignment_index" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "median_alignment_index" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "alignment_index_std_dev" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p25" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p50" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p75" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p90" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p95" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "alignment_p99" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avg_drift_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "high_drift_users" INTEGER NOT NULL DEFAULT 0,
    "avg_sessions_per_user" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avg_messages_per_user" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "flagged_users" INTEGER NOT NULL DEFAULT 0,
    "flagged_reason_counts" JSONB NOT NULL DEFAULT '{}',
    "outlier_wallets" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_report_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_apps" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "website_url" TEXT,
    "redirect_uris" TEXT[],
    "app_secret" TEXT NOT NULL,
    "tier" "AppTier" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "developer_email" TEXT,
    "developer_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_app_permissions" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "agent_app_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "parent_session_id" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_session_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "app_context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memory_entries" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "type" "MemoryEntryType" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memory_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_usage_metrics" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "session_id" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_app_organizations" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approved_apps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocked_apps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "require_approval_for" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "admin_wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_app_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_pending_authorizations" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "redirect_uri" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_pending_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sdk_api_key_challenges" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sdk_api_key_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guided_discovery_sessions_wallet_address_idx" ON "guided_discovery_sessions"("wallet_address");

-- CreateIndex
CREATE INDEX "guided_discovery_sessions_status_idx" ON "guided_discovery_sessions"("status");

-- CreateIndex
CREATE INDEX "guided_discovery_sessions_started_at_idx" ON "guided_discovery_sessions"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "memory_report_preferences_wallet_address_key" ON "memory_report_preferences"("wallet_address");

-- CreateIndex
CREATE INDEX "memory_report_preferences_wallet_address_idx" ON "memory_report_preferences"("wallet_address");

-- CreateIndex
CREATE INDEX "memory_reports_wallet_address_idx" ON "memory_reports"("wallet_address");

-- CreateIndex
CREATE INDEX "memory_reports_period_start_idx" ON "memory_reports"("period_start");

-- CreateIndex
CREATE INDEX "memory_reports_is_flagged_idx" ON "memory_reports"("is_flagged");

-- CreateIndex
CREATE INDEX "memory_report_aggregates_period_start_idx" ON "memory_report_aggregates"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "agent_apps_appId_key" ON "agent_apps"("appId");

-- CreateIndex
CREATE INDEX "agent_apps_appId_idx" ON "agent_apps"("appId");

-- CreateIndex
CREATE INDEX "agent_apps_tier_idx" ON "agent_apps"("tier");

-- CreateIndex
CREATE INDEX "agent_app_permissions_wallet_address_idx" ON "agent_app_permissions"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_app_permissions_app_id_idx" ON "agent_app_permissions"("app_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_app_permissions_wallet_address_app_id_key" ON "agent_app_permissions"("wallet_address", "app_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_sessions_session_id_key" ON "agent_sessions"("session_id");

-- CreateIndex
CREATE INDEX "agent_sessions_wallet_address_idx" ON "agent_sessions"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_sessions_app_id_idx" ON "agent_sessions"("app_id");

-- CreateIndex
CREATE INDEX "agent_sessions_started_at_idx" ON "agent_sessions"("started_at");

-- CreateIndex
CREATE INDEX "agent_session_messages_session_id_idx" ON "agent_session_messages"("session_id");

-- CreateIndex
CREATE INDEX "agent_session_messages_created_at_idx" ON "agent_session_messages"("created_at");

-- CreateIndex
CREATE INDEX "agent_memory_entries_wallet_address_idx" ON "agent_memory_entries"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_memory_entries_app_id_idx" ON "agent_memory_entries"("app_id");

-- CreateIndex
CREATE INDEX "agent_memory_entries_type_idx" ON "agent_memory_entries"("type");

-- CreateIndex
CREATE INDEX "agent_memory_entries_created_at_idx" ON "agent_memory_entries"("created_at");

-- CreateIndex
CREATE INDEX "app_usage_metrics_app_id_idx" ON "app_usage_metrics"("app_id");

-- CreateIndex
CREATE INDEX "app_usage_metrics_wallet_address_idx" ON "app_usage_metrics"("wallet_address");

-- CreateIndex
CREATE INDEX "app_usage_metrics_timestamp_idx" ON "app_usage_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "app_usage_metrics_app_id_timestamp_idx" ON "app_usage_metrics"("app_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "agent_app_organizations_org_id_key" ON "agent_app_organizations"("org_id");

-- CreateIndex
CREATE INDEX "agent_app_organizations_org_id_idx" ON "agent_app_organizations"("org_id");

-- CreateIndex
CREATE INDEX "agent_app_organizations_admin_wallet_address_idx" ON "agent_app_organizations"("admin_wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_pending_authorizations_state_key" ON "oauth_pending_authorizations"("state");

-- CreateIndex
CREATE INDEX "oauth_pending_authorizations_state_idx" ON "oauth_pending_authorizations"("state");

-- CreateIndex
CREATE INDEX "oauth_pending_authorizations_wallet_address_idx" ON "oauth_pending_authorizations"("wallet_address");

-- CreateIndex
CREATE INDEX "oauth_pending_authorizations_app_id_idx" ON "oauth_pending_authorizations"("app_id");

-- CreateIndex
CREATE INDEX "oauth_pending_authorizations_expires_at_idx" ON "oauth_pending_authorizations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sdk_api_key_challenges_challenge_id_key" ON "sdk_api_key_challenges"("challenge_id");

-- CreateIndex
CREATE INDEX "sdk_api_key_challenges_challenge_id_idx" ON "sdk_api_key_challenges"("challenge_id");

-- CreateIndex
CREATE INDEX "sdk_api_key_challenges_wallet_address_idx" ON "sdk_api_key_challenges"("wallet_address");

-- CreateIndex
CREATE INDEX "sdk_api_key_challenges_expires_at_idx" ON "sdk_api_key_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_nonces_wallet_address_nonce_key" ON "auth_nonces"("wallet_address", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "rag_public_keys_publicKey_key" ON "rag_public_keys"("publicKey");

-- CreateIndex
CREATE INDEX "rag_public_keys_publicKey_idx" ON "rag_public_keys"("publicKey");

-- AddForeignKey
ALTER TABLE "agent_app_permissions" ADD CONSTRAINT "agent_app_permissions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_session_messages" ADD CONSTRAINT "agent_session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_usage_metrics" ADD CONSTRAINT "app_usage_metrics_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
