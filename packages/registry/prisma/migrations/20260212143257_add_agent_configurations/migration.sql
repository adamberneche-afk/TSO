-- CreateAgentConfigurationTable
CREATE TABLE "agent_configurations" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "nft_token_id" TEXT NOT NULL,
    "nft_contract_address" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_configurations_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "agent_configurations_wallet_address_idx" ON "agent_configurations"("wallet_address");
CREATE INDEX "agent_configurations_nft_token_id_idx" ON "agent_configurations"("nft_token_id");
CREATE INDEX "agent_configurations_is_active_idx" ON "agent_configurations"("is_active");
