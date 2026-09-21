-- The RAGSession model (rag session-token issuance/lookup, backing
-- POST /rag/session/start, GET /rag/session/active, POST /rag/session/end)
-- has been in schema.prisma without ever having a migration create its
-- table -- confirmed absent in every environment (`prisma migrate diff`
-- against a live database reports it as missing everywhere). Every call
-- into ragSession.ts's Prisma queries has always thrown
-- "table does not exist" in any environment that actually reaches this
-- code path.
CREATE TABLE "rAGSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "bytesUploaded" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "rAGSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rAGSession_sessionId_key" ON "rAGSession"("sessionId");
CREATE INDEX "rAGSession_sessionId_idx" ON "rAGSession"("sessionId");
CREATE INDEX "rAGSession_walletAddress_idx" ON "rAGSession"("walletAddress");
CREATE INDEX "rAGSession_expiresAt_idx" ON "rAGSession"("expiresAt");
