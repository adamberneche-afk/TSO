// Regression tests for App RAG (docs/DOCS_VS_CODEBASE.md row 14):
// GET /api/v1/agent/rag lets an OAuth-authorized third-party app read
// the authorizing wallet's own public/community RAG documents. Before
// this, row 14 was NOT BUILT at all -- the only trace of it was a
// disconnected, architecturally-backwards frontend file
// (tais_frontend/src/services/rag/appRAGAuth.ts, which assumed TAIS
// connects OUT to each third-party app's own OAuth/RAG server, the
// wrong direction for "third-party dev SDK") plus a schema-only
// RAGAppConnection model nothing ever wrote to.

import request from 'supertest';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import app from '../../index';
import { createTestWallet, signRegisterAppChallenge, completeOAuthFlow } from '../testSigning';
import { encryptCommunityData } from '../../services/communityCrypto';

const testWallet = createTestWallet();
const TEST_WALLET = testWallet.address;
const REDIRECT_URI = 'http://localhost:3000/callback';

describe('App RAG: GET /agent/rag', () => {
  const prisma = (global as any).prismaTest;
  let ragReadToken: string;
  let noRagScopeToken: string;
  const seededDocIds: string[] = [];

  beforeAll(async () => {
    // Token with rag:read (the scope this endpoint requires).
    const appId1 = 'rag-app-' + crypto.randomBytes(4).toString('hex');
    const { signature: sig1, timestamp: ts1 } = await signRegisterAppChallenge(testWallet, { appId: appId1, name: 'RAG App' });
    const register1 = await request(app)
      .post('/api/v1/oauth/register-app')
      .send({ appId: appId1, name: 'RAG App', redirectUris: [REDIRECT_URI], wallet: TEST_WALLET, signature: sig1, timestamp: ts1 })
      .expect(200);
    const tokens1 = await completeOAuthFlow(app, testWallet, {
      appId: appId1,
      appSecret: register1.body.app.appSecret,
      scopes: ['rag:read'],
      redirectUri: REDIRECT_URI,
    });
    ragReadToken = tokens1.accessToken;

    // A second, otherwise-valid token that was never granted rag:read --
    // proves the scope check actually gates this endpoint, not just
    // "any authenticated OAuth token."
    const appId2 = 'no-rag-app-' + crypto.randomBytes(4).toString('hex');
    const { signature: sig2, timestamp: ts2 } = await signRegisterAppChallenge(testWallet, { appId: appId2, name: 'No RAG App' });
    const register2 = await request(app)
      .post('/api/v1/oauth/register-app')
      .send({ appId: appId2, name: 'No RAG App', redirectUris: [REDIRECT_URI], wallet: TEST_WALLET, signature: sig2, timestamp: ts2 })
      .expect(200);
    const tokens2 = await completeOAuthFlow(app, testWallet, {
      appId: appId2,
      appSecret: register2.body.app.appSecret,
      scopes: ['agent:identity:read'],
      redirectUri: REDIRECT_URI,
    });
    noRagScopeToken = tokens2.accessToken;

    // Seed real documents directly (bypassing the client-side upload
    // flow, which isn't under test here): one real community-encrypted
    // public doc the endpoint should decrypt and return, one private
    // doc it must never leak, and one "legacy" public doc encrypted
    // with a non-community salt the server genuinely cannot decrypt --
    // it should be counted in `skipped`, not returned or errored on.
    const communityDoc = encryptCommunityData('The real, decrypted content of a public RAG document.');
    const publicDoc = await prisma.rAGDocument.create({
      data: {
        walletAddress: TEST_WALLET.toLowerCase(),
        ownerPublicKey: 'test-owner-public-key',
        encryptedData: communityDoc.encrypted,
        encryptedMetadata: 'irrelevant-for-this-test',
        iv: communityDoc.iv,
        salt: communityDoc.salt,
        title: 'A Real Public Document',
        isPublic: true,
        tags: ['tutorial', 'rag'],
        size: 100,
        chunkCount: 0,
      },
    });
    seededDocIds.push(publicDoc.id);

    const privateDoc = await prisma.rAGDocument.create({
      data: {
        walletAddress: TEST_WALLET.toLowerCase(),
        ownerPublicKey: 'test-owner-public-key',
        encryptedData: 'ciphertext-app-must-never-see',
        encryptedMetadata: 'irrelevant',
        iv: 'iv',
        salt: 'salt',
        title: 'A Private Document',
        isPublic: false,
        tags: [],
        size: 50,
        chunkCount: 0,
      },
    });
    seededDocIds.push(privateDoc.id);

    const legacyPublicDoc = await prisma.rAGDocument.create({
      data: {
        walletAddress: TEST_WALLET.toLowerCase(),
        ownerPublicKey: 'test-owner-public-key',
        encryptedData: Buffer.from('some pre-community-crypto ciphertext').toString('base64'),
        encryptedMetadata: 'irrelevant',
        iv: Buffer.from('123456789012').toString('base64'),
        salt: Buffer.from('a-wallet-derived-salt-not-the-community-marker').toString('base64'),
        title: 'A Legacy Public Document',
        isPublic: true,
        tags: [],
        size: 60,
        chunkCount: 0,
      },
    });
    seededDocIds.push(legacyPublicDoc.id);
  });

  afterAll(async () => {
    await prisma.rAGDocument.deleteMany({ where: { id: { in: seededDocIds } } });
  });

  it('rejects a request with no token', async () => {
    const response = await request(app).get('/api/v1/agent/rag');
    expect(response.status).toBe(401);
  });

  it('rejects a valid token that was never granted rag:read', async () => {
    const response = await request(app)
      .get('/api/v1/agent/rag')
      .set('Authorization', `Bearer ${noRagScopeToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/rag:read/);
  });

  it('returns the real decrypted content of community-encrypted public documents, skipping legacy ones, and never leaks private documents', async () => {
    const response = await request(app)
      .get('/api/v1/agent/rag')
      .set('Authorization', `Bearer ${ragReadToken}`)
      .expect(200);

    expect(response.body.documents).toHaveLength(1);
    expect(response.body.documents[0]).toMatchObject({
      title: 'A Real Public Document',
      content: 'The real, decrypted content of a public RAG document.',
      tags: ['tutorial', 'rag'],
    });
    // The legacy (non-community-salt) public document is real but
    // undecryptable server-side -- it must show up as skipped, not
    // silently vanish or crash the request.
    expect(response.body.skipped).toBe(1);

    // The private document's title/content must never appear anywhere
    // in the response.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('A Private Document');
    expect(serialized).not.toContain('ciphertext-app-must-never-see');

    const auditRows = await prisma.rAGAuditLog.findMany({
      where: { walletAddress: TEST_WALLET.toLowerCase(), action: 'app_query' },
    });
    expect(auditRows.length).toBeGreaterThan(0);
    expect(auditRows[auditRows.length - 1].resultCount).toBe(1);
  });

  it('supports filtering by a title/tag query', async () => {
    const response = await request(app)
      .get('/api/v1/agent/rag')
      .query({ query: 'nonexistent-tag-xyz' })
      .set('Authorization', `Bearer ${ragReadToken}`)
      .expect(200);

    expect(response.body.documents).toHaveLength(0);
  });
});
