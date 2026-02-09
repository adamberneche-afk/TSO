import request from 'supertest';
import { app } from '../../index';
import { createSkill, createAudit, createSkillWithRelations } from '../factories';

describe('Audits Routes', () => {
  describe('GET /api/audits', () => {
    it('should return empty array when no audits exist', async () => {
      const response = await request(app)
        .get('/api/audits')
        .expect(200);

      expect(response.body.audits).toEqual([]);
    });

    it('should return list of audits', async () => {
      const { skill, audit } = await createSkillWithRelations();

      const response = await request(app)
        .get('/api/audits')
        .expect(200);

      expect(response.body.audits).toHaveLength(1);
      expect(response.body.audits[0].id).toBe(audit.id);
      expect(response.body.audits[0].skill.name).toBe(skill.name);
    });

    it('should support pagination', async () => {
      const skill = await createSkill();
      await createAudit(skill.id);
      await createAudit(skill.id);

      const response = await request(app)
        .get('/api/audits?limit=1')
        .expect(200);

      expect(response.body.audits).toHaveLength(1);
    });

    it('should order by newest first', async () => {
      const skill = await createSkill();
      const audit1 = await createAudit(skill.id);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const audit2 = await createAudit(skill.id);

      const response = await request(app)
        .get('/api/audits')
        .expect(200);

      expect(response.body.audits[0].id).toBe(audit2.id);
      expect(response.body.audits[1].id).toBe(audit1.id);
    });
  });

  describe('POST /api/audits', () => {
    it('should create new audit', async () => {
      const skill = await createSkill();
      const auditData = {
        skillHash: skill.skillHash,
        auditor: '0x9876543210987654321098765432109876543210',
        auditorNft: 'nft_123',
        status: 'SAFE',
        findings: [],
        signature: '0x' + 'a'.repeat(130),
      };

      const response = await request(app)
        .post('/api/audits')
        .send(auditData)
        .expect(201);

      expect(response.body.status).toBe('SAFE');
      expect(response.body.skillId).toBe(skill.id);
    });

    it('should block skill when audit is malicious', async () => {
      const skill = await createSkill({ isBlocked: false });
      const auditData = {
        skillHash: skill.skillHash,
        auditor: '0x9876543210987654321098765432109876543210',
        status: 'MALICIOUS',
        findings: [
          {
            rule_name: 'Credential_Theft',
            severity: 'critical',
            description: 'Reads .env file',
            evidence: 'code snippet',
          },
        ],
        signature: '0x' + 'a'.repeat(130),
      };

      await request(app)
        .post('/api/audits')
        .send(auditData)
        .expect(201);

      // Verify skill was blocked
      const updatedSkill = await prismaTest.skill.findUnique({
        where: { id: skill.id },
      });
      expect(updatedSkill?.isBlocked).toBe(true);
      expect(updatedSkill?.blockedReason).toContain('malicious');
    });

    it('should return 404 for non-existent skill', async () => {
      const auditData = {
        skillHash: 'nonexistenthash',
        auditor: '0x9876543210987654321098765432109876543210',
        status: 'SAFE',
        signature: '0x' + 'a'.repeat(130),
      };

      const response = await request(app)
        .post('/api/audits')
        .send(auditData)
        .expect(404);

      expect(response.body.error).toBe('Skill not found');
    });

    it('should store findings as JSON', async () => {
      const skill = await createSkill();
      const findings = [
        {
          rule_name: 'TestRule',
          severity: 'medium',
          description: 'Test finding',
          evidence: 'test evidence',
        },
      ];

      const response = await request(app)
        .post('/api/audits')
        .send({
          skillHash: skill.skillHash,
          auditor: '0x9876543210987654321098765432109876543210',
          status: 'SUSPICIOUS',
          findings,
          signature: '0x' + 'a'.repeat(130),
        })
        .expect(201);

      expect(response.body.findings).toEqual(findings);
    });
  });

  describe('GET /api/audits/skill/:skillHash', () => {
    it('should return audits for a skill', async () => {
      const { skill, audit } = await createSkillWithRelations();

      const response = await request(app)
        .get(`/api/audits/skill/${skill.skillHash}`)
        .expect(200);

      expect(response.body.skill.name).toBe(skill.name);
      expect(response.body.audits).toHaveLength(1);
      expect(response.body.audits[0].id).toBe(audit.id);
    });

    it('should include audit summary', async () => {
      const skill = await createSkill();
      await createAudit(skill.id, { status: 'SAFE' });
      await createAudit(skill.id, { status: 'SAFE' });
      await createAudit(skill.id, { status: 'SUSPICIOUS' });

      const response = await request(app)
        .get(`/api/audits/skill/${skill.skillHash}`)
        .expect(200);

      expect(response.body.summary).toEqual({
        total: 3,
        safe: 2,
        suspicious: 1,
        malicious: 0,
      });
    });

    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/audits/skill/nonexistenthash')
        .expect(404);

      expect(response.body.error).toBe('Skill not found');
    });
  });
});