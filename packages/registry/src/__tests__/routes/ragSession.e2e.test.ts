// Regression test for two bugs in services/ragSession.ts:
//
// 1. POST /rag/session/start never checked the signature it asked for.
//    `verifySignature` was imported but never called -- anyone could mint
//    a session token (the bearer credential used everywhere else as
//    X-Session-Token) for any wallet, just by naming that wallet, with no
//    proof of ownership at all. It also destructured `walletAddress` from
//    the body while the real client (rag-sdk) sends `wallet` -- a shape
//    mismatch that made every real call 400 regardless.
// 2. GET /rag/session/active took a bare `walletAddress` query param with
//    no auth and returned the live session's `sessionId` -- the same
//    bearer credential -- letting anyone who knew a wallet address fetch
//    and replay its active session token.

import request from 'supertest';
import app from '../../index';
import { createTestWallet, signRagSessionChallenge } from '../testSigning';

describe('RAG session auth', () => {
  describe('POST /rag/session/start', () => {
    it('rejects a garbage signature', async () => {
      const wallet = createTestWallet();

      const response = await request(app)
        .post('/api/v1/rag/session/start')
        .send({ wallet: wallet.address, signature: '0xdeadbeef', timestamp: Date.now() })
        .expect(401);

      expect(response.body.error).toContain('Invalid signature');
    });

    it('rejects a real signature from a different wallet than the one claimed', async () => {
      const claimedWallet = createTestWallet();
      const actualSigner = createTestWallet();
      const timestamp = Date.now();
      const challenge = `TAIS RAG Session Authorization\n\nWallet: ${claimedWallet.address}\nTimestamp: ${timestamp}\n\nAuthorize this session for encrypted document uploads.\n\nSession will be valid for 1 hour.`;
      const signature = await actualSigner.signMessage(challenge);

      const response = await request(app)
        .post('/api/v1/rag/session/start')
        .send({ wallet: claimedWallet.address, signature, timestamp })
        .expect(401);

      expect(response.body.error).toContain('Invalid signature');
    });

    it('mints a real session for a genuinely correct signature', async () => {
      const wallet = createTestWallet();
      const { signature, timestamp } = await signRagSessionChallenge(wallet);

      const response = await request(app)
        .post('/api/v1/rag/session/start')
        .send({ wallet: wallet.address, signature, timestamp })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeTruthy();
    });
  });

  describe('GET /rag/session/active', () => {
    it('never discloses the session token, even for a wallet with an active session', async () => {
      const wallet = createTestWallet();
      const { signature, timestamp } = await signRagSessionChallenge(wallet);

      const startResponse = await request(app)
        .post('/api/v1/rag/session/start')
        .send({ wallet: wallet.address, signature, timestamp })
        .expect(200);

      expect(startResponse.body.sessionId).toBeTruthy();

      const activeResponse = await request(app)
        .get('/api/v1/rag/session/active')
        .query({ walletAddress: wallet.address })
        .expect(200);

      expect(activeResponse.body.sessionId).toBeUndefined();
      expect(activeResponse.body.walletAddress).toBe(wallet.address.toLowerCase());
      // Confirm this is genuinely a real, callable session token that
      // /active is choosing not to disclose -- not that /start silently
      // failed to mint one.
      const bodyText = JSON.stringify(activeResponse.body);
      expect(bodyText).not.toContain(startResponse.body.sessionId);
    });
  });
});
