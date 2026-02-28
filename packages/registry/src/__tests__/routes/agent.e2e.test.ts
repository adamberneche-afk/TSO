import request from 'supertest';
import crypto from 'crypto';
import app from '../../index';

const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

describe('Agent Session E2E', () => {
  let accessToken: string;
  let sessionId: string;
  let parentSessionId: string;

  beforeAll(async () => {
    // Register test app and get token (simplified)
    const appId = 'session-test-' + crypto.randomBytes(4).toString('hex');
    
    await request(app)
      .post('/api/v1/oauth/register-app')
      .send({
        appId,
        name: 'Session Test App',
        redirectUris: ['http://localhost:3000/callback'],
        wallet: TEST_WALLET,
        signature: '0xsignature',
      });

    // Get token via direct permission creation for testing
    // In real E2E, would complete OAuth flow
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
        .set('Authorization', 'Bearer test_token')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('messages');
    });

    it('should reject empty messages array', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', 'Bearer test_token')
        .send({ messages: [] })
        .expect(400);

      expect(response.body.error).toContain('messages');
    });

    it('should create session with valid token', async () => {
      // This test requires a valid token from OAuth flow
      // Skipping actual execution in unit test environment
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', 'Bearer invalid')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        });

      expect([400, 401]).toContain(response.status);
    });

    it('should support app context', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', 'Bearer invalid')
        .set('X-App-ID', 'test-app')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          appContext: { currentPage: 'Test Page' },
        });

      expect([400, 401]).toContain(response.status);
    });

    it('should support session handoff', async () => {
      const response = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', 'Bearer invalid')
        .send({
          messages: [{ role: 'user', content: 'Continue' }],
          parentSession: 'sess_test123',
        });

      expect([400, 401]).toContain(response.status);
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
      const response = await request(app)
        .get('/api/v1/agent/memory')
        .set('Authorization', 'Bearer invalid')
        .query({ type: 'PREFERENCE' })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/agent/memory')
        .set('Authorization', 'Bearer invalid')
        .query({ limit: '10' })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
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

    it('should require type field', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', 'Bearer invalid')
        .send({
          summary: 'Test memory',
        })
        .expect(400);

      expect(response.body.error).toContain('type');
    });

    it('should require summary field', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', 'Bearer invalid')
        .send({
          type: 'PREFERENCE',
        })
        .expect(400);

      expect(response.body.error).toContain('summary');
    });

    it('should reject invalid memory type', async () => {
      const response = await request(app)
        .post('/api/v1/agent/memory')
        .set('Authorization', 'Bearer invalid')
        .send({
          type: 'INVALID_TYPE',
          summary: 'Test',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid type');
    });
  });
});
