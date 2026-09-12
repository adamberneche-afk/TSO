-- CreateEnum
CREATE TYPE "ProvenanceRole" AS ENUM ('AUTHOR', 'AUDITOR', 'VOUCHER');

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "provenance_score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "provenance_links" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "role" "ProvenanceRole" NOT NULL,
    "signature" TEXT,
    "audit_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provenance_links_skill_id_idx" ON "provenance_links"("skill_id");

-- CreateIndex
CREATE INDEX "provenance_links_wallet_idx" ON "provenance_links"("wallet");

-- CreateIndex
CREATE INDEX "skills_provenance_score_idx" ON "skills"("provenance_score");

-- AddForeignKey
ALTER TABLE "provenance_links" ADD CONSTRAINT "provenance_links_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
