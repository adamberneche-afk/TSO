import request from 'supertest';
import app from '../../index';

describe('Audits API', () => {
  describe('GET /api/v1/audits', () => {
    it('should return audits list', async () => {
      const response = await request(app)
        .get('/api/v1/audits')
        .expect(200);

      expect(response.body).toHaveProperty('audits');
      expect(Array.isArray(response.body.audits)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/audits?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('audits');
    });
  });

  describe('POST /api/v1/audits', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/audits')
        .send({ skillHash: 'test', status: 'SAFE' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
