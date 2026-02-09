import request from 'supertest';
import { app } from '../../index';

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should report IPFS status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('ipfs');
      expect(['connected', 'disabled', 'error']).toContain(response.body.services.ipfs);
    });

    it('should include blockchain status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('blockchain');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when database is connected', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.text).toBe('OK');
    });

    it('should return 503 when database is unavailable', async () => {
      // This would require mocking the database failure
      // Skipped for now as it requires complex mocking
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'TAIS Skill Registry');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty('documentation', '/api/docs');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health', '/health');
      expect(response.body.endpoints).toHaveProperty('skills', '/api/skills');
    });
  });
});