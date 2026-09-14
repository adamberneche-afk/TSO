-- Fixes pre-existing schema drift: GitHubToken has been a real, migrated
-- model in schema.prisma with no corresponding migration since it was
-- added (services/githubToken.ts is real, wired-up code) -- flagged but
-- deliberately not fixed in the 2026-09-12 handoff (see HANDOFF.md) as
-- unrelated to the PR that surfaced it. Any environment whose database
-- was built purely from migration history (rather than a manual `db push`
-- or a dump that happened to include it) 500s on any code path touching
-- this table until this migration runs.
CREATE TABLE "github_tokens" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_tokens_wallet_address_key" ON "github_tokens"("wallet_address");

-- CreateIndex
CREATE INDEX "github_tokens_wallet_address_idx" ON "github_tokens"("wallet_address");
