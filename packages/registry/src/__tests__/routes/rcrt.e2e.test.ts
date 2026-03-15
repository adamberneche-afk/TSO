import request from 'supertest';
import app from '../../index';

const TEST_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E';

describe('RCRT Routes', () => {
  describe('GET /api/v1/rcrt/status', () => {
    it('should return not provisioned for new wallet', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/status')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body).toHaveProperty('provisioned');
      expect(response.body).toHaveProperty('connected');
    });

    it('should require wallet address', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/status')
        .expect(200);

      expect(response.body.provisioned).toBe(false);
    });
  });

  describe('POST /api/v1/rcrt/provision', () => {
    it('should provision RCRT for valid wallet', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/provision')
        .send({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('agentId');
      expect(response.body).toHaveProperty('instructions');
    });

    it('should require wallet address', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/provision')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return token and agentId', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/provision')
        .send({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.agentId).toMatch(/^rcrt-/);
    });
  });

  describe('POST /api/v1/rcrt/connect', () => {
    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require token', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid provisioned token', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .send({ wallet: TEST_WALLET });

      const token = provisionResponse.body.token;

      const connectResponse = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({ token, status: 'online' })
        .expect(200);

      expect(connectResponse.body).toHaveProperty('success');
      expect(connectResponse.body).toHaveProperty('wallet');
    });
  });

  describe('DELETE /api/v1/rcrt/provision', () => {
    it('should revoke RCRT access', async () => {
      await request(app)
        .post('/api/v1/rcrt/provision')
        .send({ wallet: TEST_WALLET });

      const response = await request(app)
        .delete('/api/v1/rcrt/provision')
        .send({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should require wallet address', async () => {
      const response = await request(app)
        .delete('/api/v1/rcrt/provision')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/rcrt/audit', () => {
    it('should require wallet address', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/audit')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return audit logs for valid wallet', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/audit')
        .query({ wallet: TEST_WALLET })
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should filter by action', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/audit')
        .query({ wallet: TEST_WALLET, action: 'provision' })
        .expect(200);

      expect(response.body.logs).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/audit')
        .query({ wallet: TEST_WALLET, status: 'success' })
        .expect(200);

      expect(response.body.logs).toBeDefined();
    });
  });

  describe('POST /api/v1/rcrt/audit', () => {
    it('should create audit log entry', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/audit')
        .send({
          ownerId: TEST_WALLET,
          action: 'provision',
          agentId: 'test-agent-id',
          status: 'success'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should require ownerId and action', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/audit')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
