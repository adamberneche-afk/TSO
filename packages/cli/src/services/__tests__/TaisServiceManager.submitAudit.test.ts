// Regression test for TaisServiceManager.submitAudit being a complete
// simulation -- it never called the real AuditRegistry at all
// ("This would integrate with AuditRegistry... For now, simulate
// successful submission"), so no audit ever actually reached the
// registry regardless of what the CLI displayed to the user.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { ethers } from 'ethers';
import { TaisServiceManager } from '../TaisServiceManager';

describe('TaisServiceManager.submitAudit', () => {
  let userDataPath: string;
  let serviceManager: TaisServiceManager;

  beforeEach(() => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'tais-service-manager-test-'));
    serviceManager = new TaisServiceManager(userDataPath);
    // submitAudit gates on real Auditor NFT ownership before checking the
    // signature -- an on-chain call this test environment can't make,
    // and unrelated to what this test is verifying (that submitAudit
    // actually reaches the real AuditRegistry instead of faking success).
    jest.spyOn((serviceManager as any).auditRegistry, 'verifyAuditorNft').mockResolvedValue(true);
  });

  afterEach(() => {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  });

  it('actually persists a genuinely-signed report to the real AuditRegistry, not just simulated success', async () => {
    const wallet = ethers.Wallet.createRandom();
    const skillHash = 'f'.repeat(64);
    const timestamp = new Date().toISOString();
    const findings: any[] = [];
    const payload = `${skillHash}:${wallet.address.toLowerCase()}:safe:${JSON.stringify(findings)}:${timestamp}`;

    const report = {
      skill_hash: skillHash,
      auditor: wallet.address.toLowerCase(),
      status: 'safe' as const,
      findings,
      signature: wallet.signMessageSync(payload),
      timestamp,
      audit_method: 'manual_review' as const,
    };

    const result = await serviceManager.submitAudit(report);

    expect(result.success).toBe(true);

    // The regression check: it must have actually reached the real
    // registry and be retrievable back out, not just returned a fake
    // "audit_<timestamp>" success object with nothing behind it.
    const stored = await (serviceManager as any).auditRegistry.getAudits(skillHash);
    expect(stored).toHaveLength(1);
    expect(stored[0].auditor).toBe(wallet.address.toLowerCase());
  });

  it('surfaces a real rejection (forged signature) instead of always simulating success', async () => {
    const wallet = ethers.Wallet.createRandom();
    const skillHash = 'g'.repeat(64);
    const timestamp = new Date().toISOString();

    const report = {
      skill_hash: skillHash,
      auditor: wallet.address.toLowerCase(),
      status: 'malicious' as const,
      findings: [],
      signature: '0x' + '0'.repeat(130), // never signed by this wallet
      timestamp,
      audit_method: 'manual_review' as const,
    };

    const result = await serviceManager.submitAudit(report);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signature/i);
  });
});
