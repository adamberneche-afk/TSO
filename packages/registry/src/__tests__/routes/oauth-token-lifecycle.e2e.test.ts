import request from 'supertest';
import crypto from 'crypto';
import app from '../../index';
import { createTestWallet, signRegisterAppChallenge, signApproveChallenge } from '../testSigning';

// Regression test for the OAuth/Agent token-hashing bug: routes/oauth.ts and
// routes/agent.ts stored access/refresh tokens with
// `cryptoJS.AES.encrypt(token, ENCRYPTION_KEY)`, then looked them back up
// with `where: { accessToken: encryptToken(incomingToken) }`. CryptoJS's
// AES.encrypt generates a random salt on every call, so re-encrypting the
// same plaintext token for a lookup produced a different ciphertext than
// what was stored at grant time -- the `where` clause could never match,
// so authorization-code exchange, refresh, revocation, and every
// authenticated /agent/* request failed no matter what.
//
// This test drives the actual HTTP routes against a real Postgres database
// (not mocks), so it only passes if every lookup actually finds the row it
// wrote.

const testWallet = createTestWallet();
const TEST_WALLET = testWallet.address;

describe('OAuth token lifecycle E2E (hashToken regression)', () => {
  let appId: string;
  let appSecret: string;

  beforeAll(async () => {
    appId = 'token-lifecycle-' + crypto.randomBytes(4).toString('hex');
    const appName = 'Token Lifecycle Test App';

    const { signature, timestamp } = await signRegisterAppChallenge(testWallet, { appId, name: appName });

    const registerResponse = await request(app)
      .post('/api/v1/oauth/register-app')
      .send({
        appId,
        name: appName,
        redirectUris: ['http://localhost:3000/callback'],
        wallet: TEST_WALLET,
        signature,
        timestamp,
      })
      .expect(200);

    appSecret = registerResponse.body.app.appSecret;
  });

  it('completes the full authorize -> approve -> token -> agent context -> revoke round trip', async () => {
    // 1. Kick off an authorization request.
    const scopes = ['agent:identity:read', 'agent:memory:read'];
    const authorizeResponse = await request(app)
      .get('/api/v1/oauth/authorize')
      .query({
        app_id: appId,
        scopes: scopes.join(','),
        redirect_uri: 'http://localhost:3000/callback',
        wallet: TEST_WALLET,
      })
      .expect(200);

    const authorizationId = authorizeResponse.body.authorizationId;
    expect(authorizationId).toBeDefined();

    // 2. Approve it. This is the first write of a hashed access/refresh
    // token pair.
    const approveSignature = await signApproveChallenge(testWallet, { appId, scopes, authorizationId });
    const approveResponse = await request(app)
      .post('/api/v1/oauth/approve')
      .send({
        authorizationId,
        wallet: TEST_WALLET,
        signature: approveSignature,
      })
      .expect(200);

    expect(approveResponse.body.success).toBe(true);
    const redirectUri: string = approveResponse.body.redirectUri;
    const code = new URL(redirectUri).searchParams.get('code');
    expect(code).toBeTruthy();

    // 3. Exchange the code for a token. This is the first read that must
    // find the row written in step 2 by re-hashing `code` -- this is
    // exactly the lookup that always failed under the old encryption-based
    // scheme.
    const tokenResponse = await request(app)
      .post('/api/v1/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code,
        app_id: appId,
        app_secret: appSecret,
      })
      .expect(200);

    const accessToken: string = tokenResponse.body.access_token;
    const refreshToken: string = tokenResponse.body.refresh_token;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(tokenResponse.body.walletAddress).toBe(TEST_WALLET.toLowerCase());

    // 4. Use the freshly issued access token against a real /agent/*
    // endpoint (routes/agent.ts has its own, separate hashToken lookup).
    const contextResponse = await request(app)
      .get('/api/v1/agent/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(contextResponse.body.walletAddress).toBe(TEST_WALLET.toLowerCase());

    // 5. Refresh the token and confirm the *new* access token is the one
    // that authenticates -- proves the row was actually updated with a
    // hash the next lookup can find, not left stale.
    const refreshResponse = await request(app)
      .post('/api/v1/oauth/token')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        app_id: appId,
        app_secret: appSecret,
      })
      .expect(200);

    const rotatedAccessToken: string = refreshResponse.body.access_token;
    expect(rotatedAccessToken).toBeTruthy();
    expect(rotatedAccessToken).not.toBe(accessToken);

    await request(app)
      .get('/api/v1/agent/context')
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .expect(200);

    // The old, rotated-out access token must no longer work.
    await request(app)
      .get('/api/v1/agent/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    // 6. Revoke, then confirm the token is actually rejected afterward --
    // revoke() does its own hashToken lookup too.
    await request(app)
      .post('/api/v1/oauth/revoke')
      .send({
        access_token: rotatedAccessToken,
        wallet: TEST_WALLET,
        app_id: appId,
      })
      .expect(200);

    await request(app)
      .get('/api/v1/agent/context')
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .expect(401);
  });
});
