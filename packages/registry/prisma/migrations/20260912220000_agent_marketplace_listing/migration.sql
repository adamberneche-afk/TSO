-- CreateEnum
CREATE TYPE "AgentListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "agent_listings" (
    "id" TEXT NOT NULL,
    "configuration_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "AgentListingStatus" NOT NULL DEFAULT 'PENDING',
    "install_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_listings_configuration_id_key" ON "agent_listings"("configuration_id");

-- CreateIndex
CREATE INDEX "agent_listings_wallet_address_idx" ON "agent_listings"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_listings_status_idx" ON "agent_listings"("status");

-- AddForeignKey
ALTER TABLE "agent_listings" ADD CONSTRAINT "agent_listings_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "agent_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
