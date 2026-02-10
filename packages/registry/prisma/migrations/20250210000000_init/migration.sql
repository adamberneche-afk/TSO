-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SAFE', 'SUSPICIOUS', 'MALICIOUS');

-- CreateEnum
CREATE TYPE "ApiTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "skill_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT NOT NULL,
    "manifest_cid" TEXT NOT NULL,
    "package_cid" TEXT,
    "contract_address" TEXT,
    "token_id" TEXT,
    "permissions" JSONB NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SkillStatus" NOT NULL DEFAULT 'PENDING',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMP(3),
    "blocked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "auditor" TEXT NOT NULL,
    "auditor_nft" TEXT,
    "status" "AuditStatus" NOT NULL,
    "findings" JSONB,
    "signature" TEXT NOT NULL,
    "tx_hash" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "skill_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("skill_id","category_id")
);

-- CreateTable
CREATE TABLE "skill_tags" (
    "skill_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "skill_tags_pkey" PRIMARY KEY ("skill_id","tag_id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "tier" "ApiTier" NOT NULL DEFAULT 'FREE',
    "requests_this_month" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_scans" (
    "id" TEXT NOT NULL,
    "skill_hash" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "scan_duration" INTEGER NOT NULL,
    "scanned_files" INTEGER NOT NULL,
    "scanned_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_hash_key" ON "skills"("skill_hash");

-- CreateIndex
CREATE INDEX "skills_skill_hash_idx" ON "skills"("skill_hash");

-- CreateIndex
CREATE INDEX "skills_author_idx" ON "skills"("author");

-- CreateIndex
CREATE INDEX "skills_status_idx" ON "skills"("status");

-- CreateIndex
CREATE INDEX "skills_trust_score_idx" ON "skills"("trust_score");

-- CreateIndex
CREATE INDEX "audits_skill_id_idx" ON "audits"("skill_id");

-- CreateIndex
CREATE INDEX "audits_auditor_idx" ON "audits"("auditor");

-- CreateIndex
CREATE INDEX "audits_status_idx" ON "audits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_owner_idx" ON "api_keys"("owner");

-- CreateIndex
CREATE INDEX "security_scans_skill_hash_idx" ON "security_scans"("skill_hash");

-- CreateIndex
CREATE INDEX "security_scans_severity_idx" ON "security_scans"("severity");

-- CreateIndex
CREATE INDEX "security_scans_created_at_idx" ON "security_scans"("created_at");

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tags" ADD CONSTRAINT "skill_tags_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tags" ADD CONSTRAINT "skill_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
