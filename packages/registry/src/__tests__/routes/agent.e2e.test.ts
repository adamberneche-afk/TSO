// Regression test: this file's beforeAll used to register a test app and
// then stop ("Get token via direct permission creation for testing / In
// real E2E, would complete OAuth flow" -- and never did), so `accessToken`
// was never actually set. Every test that needed to be authenticated used
// a placeholder string ('Bearer test_token' / 'Bearer invalid') instead,
// which /agent/* routes correctly reject with 401 before ever reaching the
// validation logic several of these tests are actually named for (e.g.
// "should require messages array" got a 401 auth failure, never the 400
// body-validation error it asserts on). Now completes the real
// authorize -> approve -> token-exchange round trip (see
// testSigning.ts's completeOAuthFlow) so every test below authenticates
// for real and actually exercises the behavior its name describes.

import request from 'supertest';
import crypto from 'crypto';
import app from '../../index';
import { createTestWallet, signRegisterAppChallenge, completeOAuthFlow } from '../testSigning';

const testWallet = createTestWallet();
const TEST_WALLET = testWallet.address;
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = ['agent:identity:read', 'agent:memory:read', 'agent:memory:write'];

describe('Agent Session E2E', () => {
  let accessToken: string;

  beforeAll(async () => {
    const appId = 'session-test-' + crypto.randomBytes(4).toString('hex');
    const appName = 'Session Test App';
    const { signature, timestamp } = await signRegisterAppChallenge(testWallet, { appId, name: appName });

    const registerResponse = await request(app)
      .post('/api/v1/oauth/register-app')
      .send({
        appId,
        name: appName,
        redirectUris: [REDIRECT_URI],
        wallet: TEST_WALLET,
        signature,
        timestamp,
      })
      .expect(200);

    const appSecret = registerResponse.body.app.appSecret;

    const tokens = await completeOAuthFlow(app, testWallet, {
      appId,
      appSecret,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
    });
    accessToken = tokens.accessToken;
  });

  describe('GET /agent/context', () => {
    it('should require authorization', async () => {
      const response = await request(app)
        .get('/api/v1/agent/context')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/agent/context')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('POST /agent/chat', () => {
    it('should require messages array', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('messages');
    });

    it('should reject empty messages array', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ messages: [] })
        .expect(400);

      expect(response.body.error).toContain('messages');
    });

    it('should create session with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(200);

      expect(response.body.sessionId).toBeDefined();
      expect(response.body.session.sessionId).toBe(response.body.sessionId);
    });

    it('should support app context', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-App-ID', 'test-app')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          appContext: { currentPage: 'Test Page' },
        })
        .expect(200);

      expect(response.body.sessionId).toBeDefined();
    });

    it('should support session handoff', async () => {
      const parentResponse = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ messages: [{ role: 'user', content: 'Parent message' }] })
        .expect(200);

      const parentSessionId = parentResponse.body.sessionId;

      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          messages: [{ role: 'user', content: 'Continue' }],
          parentSession: parentSessionId,
        })
        .expect(200);

      // Proves the handoff was actually recorded against the real parent
      // session created above, not just accepted and ignored.
      expect(response.body.session.parentSessionId).toBe(parentSessionId);
    });
  });

  describe('GET /agent/sessions', () => {
    it('should require authorization', async () => {
      const response = await request(app)
        .get('/api/v1/agent/sessions')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('GET /agent/memory', () => {
    it('should require authorization', async () => {
      const response = await request(app)
        .get('/api/v1/agent/memory')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should support type filter', async () => {
      // Seed one entry of each type so the filter has something real to
      // exclude/include, rather than just asserting "didn't crash" on an
      // empty result set.
      await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'PREFERENCE', summary: 'Likes dark mode' })
        .expect(200);
      await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'FACT', summary: 'Uses TypeScript' })
        .expect(200);

      const response = await request(app)
        .get('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'PREFERENCE' })
        .expect(200);

      expect(response.body.memories.length).toBeGreaterThan(0);
      for (const memory of response.body.memories) {
        expect(memory.type).toBe('PREFERENCE');
      }
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: '1' })
        .expect(200);

      expect(response.body.memories.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /agent/memory', () => {
    it('should require authorization', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .send({
          type: 'PREFERENCE',
          summary: 'Test memory',
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should create a memory entry with a valid token', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'PREFERENCE',
          summary: 'Prefers concise answers',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.entry.type).toBe('PREFERENCE');
      expect(response.body.entry.summary).toBe('Prefers concise answers');
    });

    it('should require type field', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          summary: 'Test memory',
        })
        .expect(400);

      expect(response.body.error).toContain('type');
    });

    it('should require summary field', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'PREFERENCE',
        })
        .expect(400);

      expect(response.body.error).toContain('summary');
    });

    it('should reject invalid memory type', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'INVALID_TYPE',
          summary: 'Test',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid type');
    });
  });
});
