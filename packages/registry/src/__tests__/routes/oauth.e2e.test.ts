import request from 'supertest';
import crypto from 'crypto';
import app from '../../index';

const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';
const TEST_WALLET_2 = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';

describe('OAuth E2E', () => {
  let appId: string;
  let appSecret: string;
  let authorizationId: string;
  let accessToken: string;

  describe('App Registration', () => {
    it('should register a new app', async () => {
      appId = 'test-app-' + crypto.randomBytes(4).toString('hex');
      
      const signChallenge = `TAIS App Registration\n\nApp ID: ${appId}\nApp Name: Test App\nWallet: ${TEST_WALLET}\nTimestamp: ${Date.now()}`;
      const signature = '0xsignature'; // Mock signature

      const response = await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name: 'Test App',
          description: 'E2E Test App',
          redirectUris: ['http://localhost:3000/callback'],
          websiteUrl: 'https://test.com',
          developerEmail: 'test@test.com',
          developerName: 'Test Dev',
          wallet: TEST_WALLET,
          signature,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.app.appId).toBe(appId);
      expect(response.body.app.appSecret).toBeDefined();
      appSecret = response.body.app.appSecret;
    });

    it('should reject duplicate app ID', async () => {
      const response = await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId,
          name: 'Duplicate App',
          redirectUris: ['http://localhost:3000/callback'],
          wallet: TEST_WALLET,
          signature: '0xsignature',
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/v1/oauth/register-app')
        .send({
          appId: 'incomplete-app',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('OAuth Authorization', () => {
    it('should create authorization pending state', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/authorize')
        .query({
          app_id: appId,
          scopes: 'agent:identity:read,agent:memory:read',
          redirect_uri: 'http://localhost:3000/callback',
          wallet: TEST_WALLET,
        })
        .expect(200);

      expect(response.body.authorizationId).toBeDefined();
      expect(response.body.app).toBeDefined();
      expect(response.body.app.name).toBe('Test App');
      authorizationId = response.body.authorizationId;
    });

    it('should reject invalid app', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/authorize')
        .query({
          app_id: 'non-existent-app',
          scopes: 'agent:identity:read',
          redirect_uri: 'http://localhost:3000/callback',
          wallet: TEST_WALLET,
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should reject invalid redirect URI', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/authorize')
        .query({
          app_id: appId,
          scopes: 'agent:identity:read',
          redirect_uri: 'https://evil.com/callback',
          wallet: TEST_WALLET,
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid redirect_uri');
    });

    it('should reject invalid scopes', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/authorize')
        .query({
          app_id: appId,
          scopes: 'invalid:scope,another:bad',
          redirect_uri: 'http://localhost:3000/callback',
          wallet: TEST_WALLET,
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid scopes');
    });
  });

  describe('Token Exchange', () => {
    it('should reject invalid authorization code', async () => {
      const response = await request(app)
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'invalid_code',
          app_id: appId,
          app_secret: appSecret,
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should reject invalid app credentials', async () => {
      const response = await request(app)
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'some_code',
          app_id: appId,
          app_secret: 'wrong_secret',
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should require app_id and app_secret', async () => {
      const response = await request(app)
        .post('/api/v1/oauth/token')
        .send({
          grant_type: 'authorization_code',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('App Listing', () => {
    it('should list registered apps for valid wallet', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/apps')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(Array.isArray(response.body.apps)).toBe(true);
    });

    it('should require wallet parameter', async () => {
      const response = await request(app)
        .get('/api/v1/oauth/apps')
        .expect(400);

      expect(response.body.error).toContain('wallet');
    });
  });
});
