import request from 'supertest';
import app from '../../index';

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should report service statuses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('ipfs');
      expect(response.body.services).toHaveProperty('blockchain');
    });
  });

  describe('GET /health/ready', () => {
    it('should return OK when ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });
});
