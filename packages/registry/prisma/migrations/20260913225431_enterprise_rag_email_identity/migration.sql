-- CreateTable
CREATE TABLE "email_identities" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "email_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "invited_by" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_identities_email_key" ON "email_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_identities_wallet_address_key" ON "email_identities"("wallet_address");

-- CreateIndex
CREATE INDEX "email_identities_wallet_address_idx" ON "email_identities"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_token_hash_key" ON "organization_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "organization_invitations_organization_id_idx" ON "organization_invitations"("organization_id");

-- CreateIndex
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_organization_id_email_key" ON "organization_invitations"("organization_id", "email");

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
