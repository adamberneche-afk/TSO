// Regression test for the OAuth signature-verification bypass.
//
// routes/oauth.ts called `verifySignature(wallet, challenge, signature)`
// against a function whose real signature is
// `verifySignature(message, signature, expectedAddress)` -- wallet and
// challenge were swapped into the wrong parameter slots. Worse,
// verifySignature returns a `SignatureVerificationResult` object
// ({ valid, walletAddress?, error? }), never a boolean, and the object is
// truthy even when `.valid` is false -- so `if (!isValid)` never rejected
// anything, on either /register-app or /approve, regardless of whether
// the signature was real, garbage, or from the wrong wallet entirely.
//
// This test drives the real HTTP routes with real ethers-signed
// signatures and confirms a bad signature is now actually rejected (401),
// while a genuinely correct one still succeeds.

import request from 'supertest';
import crypto from 'crypto';
import app from '../../index';
import { createTestWallet, signRegisterAppChallenge, signApproveChallenge } from '../testSigning';

describe('OAuth signature verification', () => {
  describe('POST /register-app', () => {
    it('rejects a garbage signature', async () => {
      const wallet = createTestWallet();
      const appId = 'sig-test-' + crypto.randomBytes(4).toString('hex');

      const response = await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name: 'Sig Test App',
          redirectUris: ['http://localhost:3000/callback'],
          wallet: wallet.address,
          signature: '0xdeadbeef',
          timestamp: Date.now(),
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid signature');
    });

    it('rejects a real signature from a different wallet than the one claimed', async () => {
      const claimedWallet = createTestWallet();
      const actualSigner = createTestWallet();
      const appId = 'sig-test-' + crypto.randomBytes(4).toString('hex');
      const name = 'Sig Test App';

      // Sign with actualSigner's key, but build the challenge (and the
      // request) as if claimedWallet were the one registering.
      const timestamp = Date.now();
      const challenge = `TAIS App Registration\n\nApp ID: ${appId}\nApp Name: ${name}\nWallet: ${claimedWallet.address}\nTimestamp: ${timestamp}`;
      const signature = await actualSigner.signMessage(challenge);

      const response = await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name,
          redirectUris: ['http://localhost:3000/callback'],
          wallet: claimedWallet.address,
          signature,
          timestamp,
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid signature');
    });

    it('accepts a genuinely correct signature', async () => {
      const wallet = createTestWallet();
      const appId = 'sig-test-' + crypto.randomBytes(4).toString('hex');
      const { signature, timestamp } = await signRegisterAppChallenge(wallet, { appId, name: 'Sig Test App' });

      await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name: 'Sig Test App',
          redirectUris: ['http://localhost:3000/callback'],
          wallet: wallet.address,
          signature,
          timestamp,
        })
        .expect(200);
    });
  });

  describe('POST /approve', () => {
    it('rejects a garbage signature', async () => {
      const wallet = createTestWallet();
      const appId = 'sig-test-' + crypto.randomBytes(4).toString('hex');
      const { signature, timestamp } = await signRegisterAppChallenge(wallet, { appId, name: 'Sig Test App' });

      await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name: 'Sig Test App',
          redirectUris: ['http://localhost:3000/callback'],
          wallet: wallet.address,
          signature,
          timestamp,
        })
        .expect(200);

      const authorizeResponse = await request(app)
        .get('/api/v1/oauth/authorize')
        .query({
          app_id: appId,
          scopes: 'agent:identity:read',
          redirect_uri: 'http://localhost:3000/callback',
          wallet: wallet.address,
        })
        .expect(200);

      const authorizationId = authorizeResponse.body.authorizationId;

      const approveResponse = await request(app)
        .post('/api/v1/oauth/approve')
        .send({
          authorizationId,
          wallet: wallet.address,
          signature: '0xdeadbeef',
        })
        .expect(401);

      expect(approveResponse.body.error).toContain('Invalid signature');
    });
  });
});
