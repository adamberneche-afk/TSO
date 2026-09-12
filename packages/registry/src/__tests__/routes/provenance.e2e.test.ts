// Regression tests for the real, persisted, multi-party provenance
// chain (docs/DOCS_VS_CODEBASE.md row 6). Before this, the only trace of
// a skill's provenance was the flat Audit list and a trustScore column --
// there was no shared chain-of-custody graph the way
// packages/core/src/services/IsnadService.ts's isnad chain already
// modeled locally (author/auditor/voucher links, each real-signature-
// verified), just never persisted anywhere the whole community could
// see it.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { randomUUID } from 'crypto';

import { NFTService } from '../../services/nftVerification';
import app from '../../index';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

// Mirrors the exact signed payload format packages/cli/src/commands/audit.ts
// builds (skill_hash:auditor:status:JSON(findings):timestamp).
function signAuditReport(
  wallet: ethers.HDNodeWallet,
  report: { skill_hash: string; status: string; findings: unknown[]; timestamp: string }
): string {
  const payload = `${report.skill_hash}:${wallet.address.toLowerCase()}:${report.status}:${JSON.stringify(report.findings)}:${report.timestamp}`;
  return wallet.signMessageSync(payload);
}

// Mirrors routes/provenance.ts's payload convention:
// `${skillHash}:${wallet}:voucher:${timestamp}`.
function signVouch(wallet: ethers.HDNodeWallet, skillHash: string, timestamp: string): string {
  const payload = `${skillHash}:${wallet.address.toLowerCase()}:voucher:${timestamp}`;
  return wallet.signMessageSync(payload);
}

// POST /api/v1/skills's skillSchema validates skillHash/manifestCid as a
// CIDv0 string (see validation/schemas.ts), unlike AuditReportSchema's
// skill_hash (a generic string, in practice a SHA-256 hex digest
// everywhere else in this codebase -- see that file's comment on the
// deleted `auditSchema`). Only the AUTHOR-link test below actually posts
// to POST /skills, so only it needs a real CIDv0-shaped value.
function fakeCid(seed: number): string {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  let i = seed;
  while (s.length < 44) {
    s += base58[i % base58.length];
    i = i * 7 + 13;
  }
  return `Qm${s.slice(0, 44)}`;
}

describe('Provenance chain E2E', () => {
  const prisma = (global as any).prismaTest;
  let auditorNftSpy: jest.SpyInstance;
  let publisherNftSpy: jest.SpyInstance;

  beforeAll(() => {
    auditorNftSpy = jest.spyOn(NFTService.prototype, 'verifyAuditorOwnership').mockResolvedValue(true);
    publisherNftSpy = jest.spyOn(NFTService.prototype, 'verifyPublisherOwnership').mockResolvedValue(true);
  });

  afterAll(() => {
    auditorNftSpy.mockRestore();
    publisherNftSpy.mockRestore();
  });

  describe('skill publish creates an AUTHOR link', () => {
    const author = ethers.Wallet.createRandom();
    let skillHash: string;

    afterEach(async () => {
      await prisma.skill.deleteMany({ where: { author: author.address.toLowerCase() } });
    });

    it('records a real AUTHOR provenance link, not just the author column', async () => {
      skillHash = fakeCid(Date.now() % 1000);

      const response = await request(app)
        .post('/api/v1/skills')
        .set('Authorization', `Bearer ${authToken(author.address)}`)
        .send({
          skillHash,
          name: `author-link-test-${randomUUID().slice(0, 8)}`,
          version: '1.0.0',
          author: author.address,
          manifestCid: fakeCid((Date.now() % 1000) + 1),
        })
        .expect(201);

      const skill = await prisma.skill.findUnique({ where: { id: response.body.id } });
      expect(skill.provenanceScore).toBeGreaterThan(0);

      const links = await prisma.provenanceLink.findMany({ where: { skillId: skill.id } });
      expect(links).toHaveLength(1);
      expect(links[0].role).toBe('AUTHOR');
      expect(links[0].wallet).toBe(author.address.toLowerCase());
    });
  });

  describe('audit submission, voucher links, and the combined chain', () => {
    const authorWallet = '0x4444444444444444444444444444444444444444';
    const auditor = ethers.Wallet.createRandom();
    const voucher = ethers.Wallet.createRandom();
    const otherWallet = ethers.Wallet.createRandom();
    let skillHash: string;
    let skillId: string;

    beforeEach(async () => {
      skillHash = randomUUID().replace(/-/g, '').padEnd(64, '0');
      const skill = await prisma.skill.create({
        data: {
          skillHash,
          name: `test-skill-${randomUUID().slice(0, 8)}`,
          version: '1.0.0',
          author: authorWallet.toLowerCase(),
          manifestCid: 'QmTestManifestCid00000000000000000000000000',
          permissions: {},
        },
      });
      skillId = skill.id;
    });

    afterEach(async () => {
      await prisma.provenanceLink.deleteMany({ where: { skillId } });
      await prisma.audit.deleteMany({ where: { skillId } });
      await prisma.skill.deleteMany({ where: { id: skillId } });
    });

    it('creates an AUDITOR link when an audit is submitted, surfaced in GET /audits/:skillHash', async () => {
      const report = {
        skill_hash: skillHash,
        auditor: auditor.address.toLowerCase(),
        status: 'safe' as const,
        findings: [],
        timestamp: new Date().toISOString(),
        audit_method: 'manual_review' as const,
      };
      const signature = signAuditReport(auditor, report);

      const submitResponse = await request(app)
        .post('/api/v1/audits')
        .set('Authorization', `Bearer ${authToken(auditor.address)}`)
        .send({ ...report, signature })
        .expect(201);

      expect(submitResponse.body.provenanceScore).toBeGreaterThan(0);

      const links = await prisma.provenanceLink.findMany({ where: { skillId } });
      expect(links).toHaveLength(1);
      expect(links[0].role).toBe('AUDITOR');
      expect(links[0].wallet).toBe(auditor.address.toLowerCase());
      expect(links[0].auditId).toBeTruthy();

      const getResponse = await request(app).get(`/api/v1/audits/${skillHash}`).expect(200);
      expect(getResponse.body.skill.provenanceScore).toBeGreaterThan(0);
      expect(getResponse.body.provenanceChain).toHaveLength(1);
      expect(getResponse.body.provenanceChain[0]).toMatchObject({
        wallet: auditor.address.toLowerCase(),
        role: 'auditor',
      });
    });

    it('rejects a vouch whose wallet does not match the authenticated session', async () => {
      const timestamp = new Date().toISOString();
      const signature = signVouch(voucher, skillHash, timestamp);

      const response = await request(app)
        .post(`/api/v1/provenance/${skillHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(otherWallet.address)}`)
        .send({ wallet: voucher.address, signature, timestamp });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Wallet mismatch');
    });

    it('rejects a vouch with a forged signature', async () => {
      const timestamp = new Date().toISOString();
      const forgedSignature = otherWallet.signMessageSync('not the real payload');

      const response = await request(app)
        .post(`/api/v1/provenance/${skillHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(voucher.address)}`)
        .send({ wallet: voucher.address, signature: forgedSignature, timestamp });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('rejects a vouch for a skill that does not exist', async () => {
      const missingHash = randomUUID().replace(/-/g, '').padEnd(64, '9');
      const timestamp = new Date().toISOString();
      const signature = signVouch(voucher, missingHash, timestamp);

      const response = await request(app)
        .post(`/api/v1/provenance/${missingHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(voucher.address)}`)
        .send({ wallet: voucher.address, signature, timestamp });

      expect(response.status).toBe(404);
    });

    it('accepts a validly signed vouch, records a VOUCHER link, and rejects a duplicate from the same wallet', async () => {
      const timestamp = new Date().toISOString();
      const signature = signVouch(voucher, skillHash, timestamp);

      const response = await request(app)
        .post(`/api/v1/provenance/${skillHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(voucher.address)}`)
        .send({ wallet: voucher.address, signature, timestamp, notes: 'used it, works great' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.provenanceScore).toBeGreaterThan(0);

      const links = await prisma.provenanceLink.findMany({ where: { skillId, role: 'VOUCHER' } });
      expect(links).toHaveLength(1);
      expect(links[0].wallet).toBe(voucher.address.toLowerCase());
      expect(links[0].notes).toBe('used it, works great');

      // Duplicate: same wallet vouching for the same skill again.
      const secondTimestamp = new Date().toISOString();
      const secondSignature = signVouch(voucher, skillHash, secondTimestamp);
      const duplicateResponse = await request(app)
        .post(`/api/v1/provenance/${skillHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(voucher.address)}`)
        .send({ wallet: voucher.address, signature: secondSignature, timestamp: secondTimestamp });

      expect(duplicateResponse.status).toBe(409);

      const linksAfterDuplicate = await prisma.provenanceLink.findMany({ where: { skillId, role: 'VOUCHER' } });
      expect(linksAfterDuplicate).toHaveLength(1);
    });

    it('reflects author, auditor, and voucher links together in the combined chain', async () => {
      // Auditor link.
      const auditReport = {
        skill_hash: skillHash,
        auditor: auditor.address.toLowerCase(),
        status: 'safe' as const,
        findings: [],
        timestamp: new Date().toISOString(),
        audit_method: 'manual_review' as const,
      };
      await request(app)
        .post('/api/v1/audits')
        .set('Authorization', `Bearer ${authToken(auditor.address)}`)
        .send({ ...auditReport, signature: signAuditReport(auditor, auditReport) })
        .expect(201);

      // Voucher link.
      const timestamp = new Date().toISOString();
      await request(app)
        .post(`/api/v1/provenance/${skillHash}/vouch`)
        .set('Authorization', `Bearer ${authToken(voucher.address)}`)
        .send({ wallet: voucher.address, signature: signVouch(voucher, skillHash, timestamp), timestamp })
        .expect(201);

      // This skill's own AUTHOR link was seeded directly via
      // prisma.skill.create in beforeEach (not through POST /skills, so
      // there's no AUTHOR link here) -- add one explicitly so the chain
      // exercises all three roles together.
      await prisma.provenanceLink.create({
        data: { skillId, wallet: authorWallet.toLowerCase(), role: 'AUTHOR' },
      });

      const getResponse = await request(app).get(`/api/v1/audits/${skillHash}`).expect(200);
      const roles = getResponse.body.provenanceChain.map((link: { role: string }) => link.role).sort();
      expect(roles).toEqual(['auditor', 'author', 'voucher'].sort());
      expect(getResponse.body.skill.provenanceScore).toBeGreaterThan(0);
      expect(getResponse.body.skill.provenanceScore).toBeLessThanOrEqual(1);
    });
  });
});
