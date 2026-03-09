/*
  Warnings:

  - The primary key for the `cto_insights` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `ConfidentialGrant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KBAccessHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KBRegistry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RCRTAgent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoutingLog` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `upvotes` on table `cto_insights` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `cto_insights` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `cto_insights` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `cto_insights` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cto_insights" DROP CONSTRAINT "cto_insights_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "upvotes" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "cto_insights_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "ConfidentialGrant";

-- DropTable
DROP TABLE "KBAccessHistory";

-- DropTable
DROP TABLE "KBRegistry";

-- DropTable
DROP TABLE "RCRTAgent";

-- DropTable
DROP TABLE "RoutingLog";

-- DropEnum
DROP TYPE "context_type";

-- CreateTable
CREATE TABLE "rcrt_agents" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_seen" TIMESTAMP(3),
    "provisioned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rcrt_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_registries" (
    "id" TEXT NOT NULL,
    "kb_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "app_id" TEXT,
    "context_type" TEXT NOT NULL DEFAULT 'public',
    "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluded_from_rcrt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kb_registries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kb_access_history" (
    "id" TEXT NOT NULL,
    "kb_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "grant_type" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "kb_access_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confidential_grants" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "confidential_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_logs" (
    "id" TEXT NOT NULL,
    "breadcrumb_id" TEXT NOT NULL,
    "target_app_id" TEXT NOT NULL,
    "context_type" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rcrt_agents_agent_id_key" ON "rcrt_agents"("agent_id");

-- CreateIndex
CREATE INDEX "rcrt_agents_owner_id_idx" ON "rcrt_agents"("owner_id");

-- CreateIndex
CREATE INDEX "rcrt_agents_status_idx" ON "rcrt_agents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kb_registries_kb_id_key" ON "kb_registries"("kb_id");

-- CreateIndex
CREATE INDEX "kb_registries_owner_id_idx" ON "kb_registries"("owner_id");

-- CreateIndex
CREATE INDEX "kb_registries_kb_id_idx" ON "kb_registries"("kb_id");

-- CreateIndex
CREATE INDEX "kb_access_history_kb_id_idx" ON "kb_access_history"("kb_id");

-- CreateIndex
CREATE INDEX "kb_access_history_app_id_idx" ON "kb_access_history"("app_id");

-- CreateIndex
CREATE INDEX "confidential_grants_owner_id_idx" ON "confidential_grants"("owner_id");

-- CreateIndex
CREATE INDEX "confidential_grants_app_id_idx" ON "confidential_grants"("app_id");

-- CreateIndex
CREATE INDEX "routing_logs_breadcrumb_id_idx" ON "routing_logs"("breadcrumb_id");

-- CreateIndex
CREATE INDEX "routing_logs_target_app_id_idx" ON "routing_logs"("target_app_id");

-- CreateIndex
CREATE INDEX "routing_logs_timestamp_idx" ON "routing_logs"("timestamp");
