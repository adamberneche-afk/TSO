// Regression tests for the real POST /api/v1/audits submission path and
// the trust-score computation it feeds (docs/DOCS_VS_CODEBASE.md rows 6
// and 9). Before this, routes/audits.ts only implemented the GET routes:
// a real signed AuditReport from packages/cli/src/commands/audit.ts had
// nowhere to go, `Skill.trustScore` was a static column nothing ever
// wrote to, and `POST /api/v1/audits` 401'd for lack of a handler at all
// (the auth/NFT middleware chain in index.ts was already wired up and
// waiting -- see its "Squad Delta CRITICAL FIX" comment there).

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
function signReport(
  wallet: ethers.HDNodeWallet,
  report: { skill_hash: string; status: string; findings: unknown[]; timestamp: string }
): string {
  const payload = `${report.skill_hash}:${wallet.address.toLowerCase()}:${report.status}:${JSON.stringify(report.findings)}:${report.timestamp}`;
  return wallet.signMessageSync(payload);
}

describe('POST /api/v1/audits submission', () => {
  const prisma = (global as any).prismaTest;
  const auditor = ethers.Wallet.createRandom();
  const otherWallet = ethers.Wallet.createRandom();
  let nftSpy: jest.SpyInstance;
  let skillHash: string;
  let skillId: string;

  beforeAll(() => {
    nftSpy = jest.spyOn(NFTService.prototype, 'verifyAuditorOwnership').mockResolvedValue(true);
  });

  afterAll(() => {
    nftSpy.mockRestore();
  });

  beforeEach(async () => {
    skillHash = randomUUID().replace(/-/g, '').padEnd(64, '0');
    const skill = await prisma.skill.create({
      data: {
        skillHash,
        name: `test-skill-${randomUUID().slice(0, 8)}`,
        version: '1.0.0',
        author: '0x4444444444444444444444444444444444444444'.toLowerCase(),
        manifestCid: 'QmTestManifestCid00000000000000000000000000',
        permissions: {},
      },
    });
    skillId = skill.id;
  });

  afterEach(async () => {
    await prisma.audit.deleteMany({ where: { skillId } });
    await prisma.skill.deleteMany({ where: { id: skillId } });
  });

  function buildReport(overrides: Partial<{ status: string; findings: unknown[]; timestamp: string }> = {}) {
    const base = {
      skill_hash: skillHash,
      auditor: auditor.address.toLowerCase(),
      status: overrides.status ?? 'safe',
      findings: overrides.findings ?? [],
      timestamp: overrides.timestamp ?? new Date().toISOString(),
      audit_method: 'manual_review' as const,
    };
    const signature = signReport(auditor, base);
    return { ...base, signature };
  }

  it('rejects a report whose auditor field does not match the authenticated wallet', async () => {
    const report = buildReport();

    const response = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(otherWallet.address)}`)
      .send(report);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Auditor mismatch');

    const audits = await prisma.audit.findMany({ where: { skillId } });
    expect(audits).toHaveLength(0);
  });

  it('rejects a report with a forged signature', async () => {
    const report = buildReport();
    const forged = { ...report, signature: otherWallet.signMessageSync('not the real payload') };

    const response = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(auditor.address)}`)
      .send(forged);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid signature');

    const audits = await prisma.audit.findMany({ where: { skillId } });
    expect(audits).toHaveLength(0);
  });

  it('rejects a report for a skill that does not exist', async () => {
    const report = buildReport();
    report.skill_hash = randomUUID().replace(/-/g, '').padEnd(64, '9');
    // Re-sign since skill_hash changed.
    report.signature = signReport(auditor, report);

    const response = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(auditor.address)}`)
      .send(report);

    expect(response.status).toBe(404);
  });

  it('accepts a validly signed report, persists it, and returns a trust score', async () => {
    const report = buildReport({ status: 'safe' });

    const response = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(auditor.address)}`)
      .send(report);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.trustScore).toBe(1);
    expect(response.body.isBlocked).toBe(false);

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    expect(skill.trustScore).toBe(1);
    expect(skill.isBlocked).toBe(false);

    const persisted = await prisma.audit.findMany({ where: { skillId } });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].status).toBe('SAFE');
    expect(persisted[0].auditor).toBe(auditor.address.toLowerCase());

    // GET /:skillHash is the read side of the same round trip (what
    // `tais verify` will actually call) -- confirm it reflects the same
    // trust score and block state, not just the raw DB row.
    const getResponse = await request(app).get(`/api/v1/audits/${skillHash}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.skill.trustScore).toBe(1);
    expect(getResponse.body.skill.isBlocked).toBe(false);
    expect(getResponse.body.audits).toHaveLength(1);
  });

  it('blocks the skill and zeroes its trust contribution once any audit reports malicious', async () => {
    const safeReport = buildReport({ status: 'safe' });
    await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(auditor.address)}`)
      .send(safeReport)
      .expect(201);

    const maliciousAuditor = ethers.Wallet.createRandom();
    const maliciousReport = {
      skill_hash: skillHash,
      auditor: maliciousAuditor.address.toLowerCase(),
      status: 'malicious',
      findings: [{ rule_name: 'exfil', description: 'phones home', severity: 'critical', evidence: 'net.send(...)' }],
      timestamp: new Date().toISOString(),
      audit_method: 'yara_scan' as const,
    };
    const signature = signReport(maliciousAuditor, maliciousReport);

    const response = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${authToken(maliciousAuditor.address)}`)
      .send({ ...maliciousReport, signature });

    expect(response.status).toBe(201);
    expect(response.body.isBlocked).toBe(true);
    // 1 safe (1.0) + 1 malicious (0.0), averaged = 0.5
    expect(response.body.trustScore).toBe(0.5);

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    expect(skill.isBlocked).toBe(true);
    expect(skill.blockedReason).toMatch(/community audit/i);
  });
});
