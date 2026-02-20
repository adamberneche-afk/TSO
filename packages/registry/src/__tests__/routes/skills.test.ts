import request from 'supertest';
import app from '../../index';

describe('Skills API', () => {
  describe('GET /api/v1/skills', () => {
    it('should return skills list with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/skills')
        .expect(200);

      expect(response.body).toHaveProperty('skills');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.skills)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/skills?limit=10&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('skills');
    });
  });

  describe('GET /api/v1/skills/:hash', () => {
    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/v1/skills/nonexistenthash123')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/skills', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/skills')
        .send({ name: 'Test Skill' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
