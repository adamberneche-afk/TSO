-- Create RAG Document table
CREATE TABLE "rag_documents" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "owner_public_key" TEXT NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "encrypted_metadata" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "title" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "size" INTEGER NOT NULL,
    "chunk_count" INTEGER NOT NULL,
    "storage_url" TEXT,
    "allowed_viewers" TEXT[],
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "popularity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- Create RAG Chunk table
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "encrypted_content" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "embedding_hash" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id")
);

-- Create RAG User Usage table
CREATE TABLE "rag_user_usage" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "storage_used" INTEGER NOT NULL DEFAULT 0,
    "embeddings_this_month" INTEGER NOT NULL DEFAULT 0,
    "last_reset_month" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queries_today" INTEGER NOT NULL DEFAULT 0,
    "last_reset_day" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_connections_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_user_usage_pkey" PRIMARY KEY ("id")
);

-- Create RAG Public Keys table
CREATE TABLE "rag_public_keys" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_public_keys_pkey" PRIMARY KEY ("id")
);

-- Create RAG App Connections table
CREATE TABLE "rag_app_connections" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "permissions" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_app_connections_pkey" PRIMARY KEY ("id")
);

-- Create RAG Audit Log table
CREATE TABLE "rag_audit_logs" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "document_id" TEXT,
    "query_hash" TEXT,
    "result_count" INTEGER,
    "duration" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "rag_user_usage_wallet_address_key" ON "rag_user_usage"("wallet_address");
CREATE UNIQUE INDEX "rag_public_keys_wallet_address_key" ON "rag_public_keys"("wallet_address");
CREATE UNIQUE INDEX "rag_public_keys_public_key_key" ON "rag_public_keys"("public_key");
CREATE UNIQUE INDEX "rag_app_connections_wallet_address_app_id_key" ON "rag_app_connections"("wallet_address", "app_id");

-- Create indexes for performance
CREATE INDEX "rag_documents_wallet_address_idx" ON "rag_documents"("wallet_address");
CREATE INDEX "rag_documents_is_public_idx" ON "rag_documents"("is_public");
CREATE INDEX "rag_documents_tags_idx" ON "rag_documents"("tags");
CREATE INDEX "rag_documents_created_at_idx" ON "rag_documents"("created_at");
CREATE INDEX "rag_documents_popularity_score_idx" ON "rag_documents"("popularity_score");

CREATE INDEX "rag_chunks_document_id_idx" ON "rag_chunks"("document_id");
CREATE INDEX "rag_chunks_embedding_hash_idx" ON "rag_chunks"("embedding_hash");

CREATE INDEX "rag_user_usage_wallet_address_idx" ON "rag_user_usage"("wallet_address");
CREATE INDEX "rag_public_keys_wallet_address_idx" ON "rag_public_keys"("wallet_address");
CREATE INDEX "rag_public_keys_public_key_idx" ON "rag_public_keys"("public_key");
CREATE INDEX "rag_app_connections_wallet_address_idx" ON "rag_app_connections"("wallet_address");
CREATE INDEX "rag_app_connections_app_id_idx" ON "rag_app_connections"("app_id");
CREATE INDEX "rag_audit_logs_wallet_address_idx" ON "rag_audit_logs"("wallet_address");
CREATE INDEX "rag_audit_logs_action_idx" ON "rag_audit_logs"("action");
CREATE INDEX "rag_audit_logs_created_at_idx" ON "rag_audit_logs"("created_at");

-- Add foreign key constraint for chunks
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_fkey" 
    FOREIGN KEY ("document_id") REFERENCES "rag_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
