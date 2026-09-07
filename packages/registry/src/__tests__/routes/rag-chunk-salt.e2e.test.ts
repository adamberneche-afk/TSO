// Regression test for the RAG chunk salt-drop bug and the upload route's
// incompatibility with the real E2EE client payload.
//
// Each chunk is encrypted client-side (PublicRAGClient.uploadDocument) with
// its own independently-generated random salt -- e2eeEncryption.ts's
// encrypt()/encryptForCommunity() call crypto.getRandomValues() fresh per
// call, and the AES key is derived from that salt, not the parent
// document's salt. The registry's POST /documents route used to validate
// req.body against {title, content, tags, isPublic, metadata} -- a shape
// the real client never sends (it sends
// {encryptedData, encryptedMetadata, iv, salt, ownerPublicKey, chunks: [...]}),
// so every real upload 400'd before any chunk code ran. Even setting that
// aside, the handler never persisted a chunk's salt (rag_chunks had no
// salt column) and never created any RAGChunk rows at all.
//
// This test drives the actual HTTP routes against a real Postgres database,
// uploading a document with several distinctly-salted chunks and confirming
// each chunk's exact salt (and iv/encryptedContent/embeddingHash) comes back
// unchanged from GET /documents/:id/chunks.

import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../../index';

const TEST_WALLET = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

function fakeChunk(index: number) {
  // Distinct per chunk, the same way real encryption produces a distinct
  // salt/iv for every chunk -- if the salt were ever reused across chunks
  // (or dropped and defaulted to something shared) this test's per-index
  // equality checks would catch it.
  return {
    index,
    encryptedContent: `ciphertext-${index}-${crypto.randomBytes(8).toString('hex')}`,
    iv: `iv-${index}-${crypto.randomBytes(4).toString('hex')}`,
    salt: `salt-${index}-${crypto.randomBytes(4).toString('hex')}`,
    embeddingHash: `hash-${index}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

describe('RAG chunk salt persistence E2E', () => {
  it('persists and returns each chunk\'s own salt through upload and retrieval', async () => {
    const token = authToken(TEST_WALLET);
    const chunks = [fakeChunk(0), fakeChunk(1), fakeChunk(2)];

    const uploadBody = {
      wallet: TEST_WALLET,
      encryptedData: 'doc-ciphertext',
      encryptedMetadata: 'metadata-ciphertext',
      iv: 'doc-iv',
      salt: 'doc-salt',
      ownerPublicKey: 'owner-pubkey',
      isPublic: false,
      tags: ['test'],
      chunks,
    };

    const uploadResponse = await request(app)
      .post('/api/v1/rag/documents')
      .set('Authorization', `Bearer ${token}`)
      .send(uploadBody)
      .expect(201);

    expect(uploadResponse.body.id).toBeDefined();
    expect(uploadResponse.body.chunkCount).toBe(chunks.length);
    const documentId = uploadResponse.body.id;

    // Document-level encryption fields must round-trip too.
    const getDocResponse = await request(app)
      .get(`/api/v1/rag/documents/${documentId}`)
      .set('Authorization', `Bearer ${token}`)
      .query({ wallet: TEST_WALLET })
      .expect(200);

    expect(getDocResponse.body.encryptedData).toBe(uploadBody.encryptedData);
    expect(getDocResponse.body.iv).toBe(uploadBody.iv);
    expect(getDocResponse.body.salt).toBe(uploadBody.salt);

    const chunksResponse = await request(app)
      .get(`/api/v1/rag/documents/${documentId}/chunks`)
      .set('Authorization', `Bearer ${token}`)
      .query({ wallet: TEST_WALLET })
      .expect(200);

    const returnedChunks = chunksResponse.body as any[];
    expect(returnedChunks).toHaveLength(chunks.length);

    const byIndex = [...returnedChunks].sort((a, b) => a.index - b.index);
    chunks.forEach((sent, i) => {
      const got = byIndex[i];
      expect(got.encryptedContent).toBe(sent.encryptedContent);
      expect(got.iv).toBe(sent.iv);
      expect(got.salt).toBe(sent.salt);
      expect(got.embeddingHash).toBe(sent.embeddingHash);
    });

    // Salts must actually be distinct per chunk (sanity check on the test
    // fixture itself, and on the persistence layer not collapsing them).
    const salts = new Set(byIndex.map((c) => c.salt));
    expect(salts.size).toBe(chunks.length);
  });
});
