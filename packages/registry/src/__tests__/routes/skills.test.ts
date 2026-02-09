import request from 'supertest';
import { app } from '../../index';
import { createSkill, createSkillWithRelations, generateSkillHash } from '../factories';

describe('Skills Routes', () => {
  describe('GET /api/skills', () => {
    it('should return empty array when no skills exist', async () => {
      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(response.body.skills).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return list of approved skills', async () => {
      const skill = await createSkill({ status: 'APPROVED' });

      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].name).toBe(skill.name);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should not return blocked skills', async () => {
      await createSkill({ status: 'APPROVED', isBlocked: true });
      await createSkill({ status: 'APPROVED', isBlocked: false });

      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].isBlocked).toBe(false);
    });

    it('should support pagination', async () => {
      await createSkill({ name: 'Skill 1' });
      await createSkill({ name: 'Skill 2' });

      const response = await request(app)
        .get('/api/skills?limit=1&offset=0')
        .expect(200);

      expect(response.body.skills).toHaveLength(1);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should filter by trust score', async () => {
      await createSkill({ trustScore: 0.3 });
      await createSkill({ trustScore: 0.8 });

      const response = await request(app)
        .get('/api/skills?minTrustScore=0.5')
        .expect(200);

      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].trustScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should search by query', async () => {
      await createSkill({ name: 'Weather API', description: 'Get weather data' });
      await createSkill({ name: 'Data Processor', description: 'Process data' });

      const response = await request(app)
        .get('/api/skills?q=weather')
        .expect(200);

      expect(response.body.skills).toHaveLength(1);
      expect(response.body.skills[0].name).toBe('Weather API');
    });
  });

  describe('GET /api/skills/:hash', () => {
    it('should return skill by hash', async () => {
      const skill = await createSkill();

      const response = await request(app)
        .get(`/api/skills/${skill.skillHash}`)
        .expect(200);

      expect(response.body.name).toBe(skill.name);
      expect(response.body.skillHash).toBe(skill.skillHash);
    });

    it('should increment download count', async () => {
      const skill = await createSkill({ downloadCount: 5 });

      await request(app)
        .get(`/api/skills/${skill.skillHash}`)
        .expect(200);

      // Verify download count was incremented
      const updated = await prismaTest.skill.findUnique({
        where: { id: skill.id }
      });
      expect(updated?.downloadCount).toBe(6);
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/skills/nonexistenthash123')
        .expect(404);

      expect(response.body.error).toBe('Skill not found');
    });

    it('should include related audits', async () => {
      const { skill, audit } = await createSkillWithRelations();

      const response = await request(app)
        .get(`/api/skills/${skill.skillHash}`)
        .expect(200);

      expect(response.body.audits).toHaveLength(1);
      expect(response.body.audits[0].id).toBe(audit.id);
    });
  });

  describe('POST /api/skills', () => {
    it('should create new skill', async () => {
      const skillHash = generateSkillHash();
      const skillData = {
        skillHash,
        name: 'New Test Skill',
        version: '1.0.0',
        author: '0x1234567890123456789012345678901234567890',
        manifestCid: 'QmNewManifestCid',
        permissions: { network: { domains: [] } },
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      expect(response.body.name).toBe(skillData.name);
      expect(response.body.status).toBe('PENDING');
    });

    it('should reject duplicate skill hash', async () => {
      const skill = await createSkill();
      const skillData = {
        skillHash: skill.skillHash,
        name: 'Duplicate Skill',
        version: '1.0.0',
        author: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/skills')
        .send({ name: 'Missing Fields' })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/skills/:hash/download', () => {
    it('should return download URL for skill', async () => {
      const skill = await createSkill({
        packageCid: 'QmTestPackageCid',
      });

      const response = await request(app)
        .get(`/api/skills/${skill.skillHash}/download`)
        .expect(200);

      expect(response.body.downloadUrl).toContain('ipfs.io');
      expect(response.body.downloadUrl).toContain(skill.packageCid);
    });

    it('should reject download for blocked skill', async () => {
      const skill = await createSkill({
        isBlocked: true,
        blockedReason: 'Malicious code detected',
      });

      const response = await request(app)
        .get(`/api/skills/${skill.skillHash}/download`)
        .expect(403);

      expect(response.body.error).toBe('Skill is blocked');
      expect(response.body.reason).toBe('Malicious code detected');
    });
  });
});