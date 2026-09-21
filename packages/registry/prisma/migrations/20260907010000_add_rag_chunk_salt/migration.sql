-- Each RAG chunk is encrypted with its own independently-generated random
-- salt (e2eeEncryption.ts's encrypt()/encryptForCommunity() call
-- crypto.getRandomValues() fresh per call, and the AES key is derived from
-- that salt) -- it is not the parent document's salt. rag_chunks had
-- nowhere to store it, so the client-side upload path silently dropped
-- every chunk's salt after encrypting with it, making every chunk
-- permanently undecryptable (the correct key can never be re-derived
-- without the salt it was derived with).
ALTER TABLE "rag_chunks" ADD COLUMN "salt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "rag_chunks" ALTER COLUMN "salt" DROP DEFAULT;
