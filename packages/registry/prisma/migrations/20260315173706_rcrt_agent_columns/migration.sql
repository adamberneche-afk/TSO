/*
  Warnings:

  - Added the required column `token` to the `rcrt_agents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rcrt_agents" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token" TEXT NOT NULL;
