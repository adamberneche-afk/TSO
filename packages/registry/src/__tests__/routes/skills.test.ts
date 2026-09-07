// Regression tests for GET /api/v1/skills's pagination/trending gap: the
// handler used to destructure a `trending` query param and never read it
// (dead code -- passing it had no effect on the response), had no
// limit/offset support at all, and returned a bare JSON array rather than
// an envelope -- while tais_frontend's RegistryClient has sent `trending`
// and typed the response as `{ skills, total, page, limit }` all along.
// Tracked in docs/BUG_AUDIT_2026-09.md.

import request from 'supertest';
import app from '../../index';

const TEST_SKILL_HASH_PREFIX = 'test-skills-route-';
const TEST_AUTHOR = '0x1234567890123456789012345678901234567890';

function skillFixture(suffix: string, overrides: Record<string, any> = {}) {
  return {
    skillHash: `${TEST_SKILL_HASH_PREFIX}${suffix}`,
    name: `Skills Route Test Skill ${suffix}`,
    version: '1.0.0',
    author: TEST_AUTHOR,
    manifestCid: 'QmTestManifestCid',
    permissions: {},
    status: 'APPROVED',
    ...overrides,
  };
}

describe('Skills API', () => {
  const prisma = (global as any).prismaTest;

  afterEach(async () => {
    await prisma.skill.deleteMany({
      where: { skillHash: { startsWith: TEST_SKILL_HASH_PREFIX } },
    });
  });

  describe('GET /api/v1/skills', () => {
    it('should return skills list with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/skills')
        .expect(200);

      expect(response.body).toHaveProperty('skills');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.skills)).toBe(true);
    });

    it('should support pagination parameters -- limit genuinely truncates the page', async () => {
      for (let i = 0; i < 3; i++) {
        await prisma.skill.create({ data: skillFixture(`page-${i}`) });
      }

      const response = await request(app)
        .get(`/api/v1/skills?limit=1&offset=0&search=${encodeURIComponent('Skills Route Test Skill page')}`)
        .expect(200);

      expect(response.body.skills.length).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('caps an attacker-supplied limit at 100, like every other list route', async () => {
      const response = await request(app)
        .get('/api/v1/skills?limit=999999')
        .expect(200);

      expect(response.body.limit).toBe(100);
    });

    it('orders by download count when trending=true, not just recency', async () => {
      // Created in low-then-high order, so recency-based (the default)
      // ordering would put "high" first anyway -- create high first and
      // low second so only a genuine downloadCount-based sort explains
      // "high" still coming first under trending=true.
      await prisma.skill.create({ data: skillFixture('trending-high', { downloadCount: 1000 }) });
      await prisma.skill.create({ data: skillFixture('trending-low', { downloadCount: 1 }) });

      const response = await request(app)
        .get(`/api/v1/skills?trending=true&search=${encodeURIComponent('Skills Route Test Skill trending')}`)
        .expect(200);

      const names = response.body.skills.map((s: any) => s.name);
      expect(names.indexOf('Skills Route Test Skill trending-high')).toBeLessThan(
        names.indexOf('Skills Route Test Skill trending-low')
      );
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
