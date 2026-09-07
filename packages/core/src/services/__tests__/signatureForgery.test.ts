// Regression tests for forgeable "signatures" in IsnadService.addLink,
// IsnadService.verifyProvenance, and AuditRegistry.submitAudit.
//
// All three used to "verify" a signature by recomputing a plain SHA-256
// hash of public fields (skillHash/wallet/role/timestamp, or
// skill_hash/auditor/status/findings/timestamp) and comparing it against
// the submitted `signature` string. Since every one of those fields is
// either supplied by the caller or already public, anyone could compute
// the same hash themselves -- no private key required -- and forge an
// isnad-chain link or audit report attributed to any wallet that happens
// to hold the right NFT, without ever controlling that wallet.
//
// The fix requires `signature` to be a real ECDSA signature (recoverable
// via ethers.verifyMessage) produced by the claimed wallet's private key.

import { ethers } from 'ethers';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { IsnadService } from '../IsnadService';
import { AuditRegistry } from '../AuditRegistry';

function sha256Hex(input: string): string {
  return require('crypto').createHash('sha256').update(input).digest('hex');
}

describe('IsnadService.addLink signature forgery', () => {
  let userDataPath: string;
  let isnadService: IsnadService;
  const attackerWallet = ethers.Wallet.createRandom();
  const victimWallet = ethers.Wallet.createRandom();

  beforeEach(() => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'isnad-forgery-test-'));
    isnadService = new IsnadService('https://eth-mainnet.g.alchemy.com/v2/demo', userDataPath);
    // addLink computes a trust score after a successful signature check,
    // which calls out to StakingService for on-chain staking weight --
    // unrelated to this fix, and this sandbox has no outbound RPC access.
    jest.spyOn((isnadService as any).stakingService, 'calculateStakingWeight').mockResolvedValue(0);
  });

  afterEach(() => {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  });

  it('rejects a forged link where "signature" is just a hash of public fields, not a real signature', async () => {
    const skillHash = 'a'.repeat(64);
    const timestamp = new Date().toISOString();
    // 'voucher' role has no NFT-ownership gate, isolating this test to
    // the signature check itself.
    const payload = `${skillHash}:${victimWallet.address}:voucher:${timestamp}`;

    const result = await isnadService.addLink(skillHash, {
      wallet: victimWallet.address,
      role: 'voucher',
      // The old attack: anyone can compute this without victimWallet's
      // private key.
      signature: sha256Hex(payload),
      timestamp,
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  it('rejects a real signature from the wrong wallet impersonating the claimed wallet', async () => {
    const skillHash = 'b'.repeat(64);
    const timestamp = new Date().toISOString();
    const payload = `${skillHash}:${victimWallet.address}:voucher:${timestamp}`;

    // A genuine signature -- just signed by the attacker, not the wallet
    // being claimed.
    const forgedSignature = attackerWallet.signMessageSync(payload);

    const result = await isnadService.addLink(skillHash, {
      wallet: victimWallet.address,
      role: 'voucher',
      signature: forgedSignature,
      timestamp,
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  it('accepts a real signature genuinely produced by the claimed wallet', async () => {
    const skillHash = 'c'.repeat(64);
    const timestamp = new Date().toISOString();
    const payload = `${skillHash}:${victimWallet.address}:voucher:${timestamp}`;

    const realSignature = victimWallet.signMessageSync(payload);

    const result = await isnadService.addLink(skillHash, {
      wallet: victimWallet.address,
      role: 'voucher',
      signature: realSignature,
      timestamp,
    } as any);

    expect(result.success).toBe(true);
  });
});

describe('AuditRegistry.submitAudit signature forgery', () => {
  let userDataPath: string;
  let auditRegistry: AuditRegistry;
  const attackerWallet = ethers.Wallet.createRandom();

  beforeEach(() => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-forgery-test-'));
    auditRegistry = new AuditRegistry('https://eth-mainnet.g.alchemy.com/v2/demo', userDataPath);
    // submitAudit gates on Auditor NFT ownership before checking the
    // signature -- stub that out (it's an on-chain call this environment
    // can't make) so the test isolates the signature-forgery fix itself.
    jest.spyOn(auditRegistry as any, 'verifyAuditorNft').mockResolvedValue(true);
  });

  afterEach(() => {
    fs.rmSync(userDataPath, { recursive: true, force: true });
  });

  function reportPayload(skillHash: string, auditor: string, status: string, findings: any[], timestamp: string) {
    return `${skillHash}:${auditor}:${status}:${JSON.stringify(findings)}:${timestamp}`;
  }

  it('rejects a forged "malicious" report where signature is just a hash of the report contents', async () => {
    const skillHash = 'd'.repeat(64);
    const timestamp = new Date().toISOString();
    const findings: any[] = [];
    const payload = reportPayload(skillHash, attackerWallet.address, 'malicious', findings, timestamp);

    const result = await auditRegistry.submitAudit({
      skill_hash: skillHash,
      auditor: attackerWallet.address,
      status: 'malicious',
      findings,
      signature: sha256Hex(payload), // the old attack
      timestamp,
      audit_method: 'manual_review',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid audit signature');
  });

  it('accepts a report with a real signature from the claimed auditor wallet', async () => {
    const skillHash = 'e'.repeat(64);
    const timestamp = new Date().toISOString();
    const findings: any[] = [];
    const payload = reportPayload(skillHash, attackerWallet.address, 'safe', findings, timestamp);

    const result = await auditRegistry.submitAudit({
      skill_hash: skillHash,
      auditor: attackerWallet.address,
      status: 'safe',
      findings,
      signature: attackerWallet.signMessageSync(payload),
      timestamp,
      audit_method: 'manual_review',
    } as any);

    expect(result.success).toBe(true);
  });
});
