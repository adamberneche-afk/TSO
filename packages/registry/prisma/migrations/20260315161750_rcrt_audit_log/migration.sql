/*
  Warnings:

  - Added the required column `owner_id` to the `routing_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "routing_logs" ADD COLUMN     "owner_id" TEXT NOT NULL,
ALTER COLUMN "breadcrumb_id" DROP NOT NULL,
ALTER COLUMN "target_app_id" DROP NOT NULL,
ALTER COLUMN "context_type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "rcrt_audit_logs" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "agent_id" TEXT,
    "token" TEXT,
    "status" TEXT,
    "error_message" TEXT,
    "context_type" TEXT,
    "target_app_id" TEXT,
    "breadcrumb_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rcrt_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rcrt_audit_logs_owner_id_idx" ON "rcrt_audit_logs"("owner_id");

-- CreateIndex
CREATE INDEX "rcrt_audit_logs_action_idx" ON "rcrt_audit_logs"("action");

-- CreateIndex
CREATE INDEX "rcrt_audit_logs_agent_id_idx" ON "rcrt_audit_logs"("agent_id");

-- CreateIndex
CREATE INDEX "rcrt_audit_logs_status_idx" ON "rcrt_audit_logs"("status");

-- CreateIndex
CREATE INDEX "rcrt_audit_logs_created_at_idx" ON "rcrt_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "routing_logs_owner_id_idx" ON "routing_logs"("owner_id");
