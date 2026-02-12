import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { ethers } from 'ethers';
import { AuditReport, YARAFinding, AuditReportSchema } from '@think/types';

// Default to THINK Genesis Bundle for beta testing
// Future: Custom contracts deployed via $THINK staking
const DEFAULT_AUDITOR_NFT = process.env.AUDITOR_NFT_ADDRESS || 
                             process.env.GENESIS_CONTRACT || 
                             '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
const ABI = ['function balanceOf(address owner) view returns (uint256)'];

interface CacheEntry {
  reports: AuditReport[];
  maliciousSkills: string[];
  timestamp: number;
  signature?: string;
}

export class AuditRegistry {
  private provider: ethers.Provider;
  private cachePath: string;
  private cacheMap: Map<string, AuditReport[]> = new Map();
  private maliciousSkills: Set<string> = new Set();
  private signingKey: string | null = null;
  private auditorNftAddress: string;

  constructor(rpcUrl: string, userDataPath: string, auditorNftAddress?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.cachePath = path.join(userDataPath, '.audit_cache.json');
    
    // Use provided address, env var, or default (Genesis Bundle for beta)
    this.auditorNftAddress = auditorNftAddress || DEFAULT_AUDITOR_NFT;
    
    this.ensureSigningKey();
    this.loadCache();
  }

  private async ensureSigningKey() {
    try {
      const secretPath = path.join(path.dirname(this.cachePath), '.audit_secret');
      try {
        await fs.access(secretPath);
        const secretContent = await fs.readFile(secretPath, 'utf-8');
        this.signingKey = secretContent.trim();
      } catch (accessError) {
        const newSecret = crypto.randomBytes(32).toString('hex');
        await fs.writeFile(secretPath, newSecret, { mode: 0o600 });
        this.signingKey = newSecret;
      }
    } catch (error) {
      console.error('Failed to initialize Audit signing key. Caching disabled.', error);
      this.signingKey = null;
    }
  }

  private async loadCache() {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const parsed = JSON.parse(data);

      for (const [skillHash, reports] of Object.entries(parsed.reports || {})) {
        if (Array.isArray(reports)) {
          this.cacheMap.set(skillHash, reports as AuditReport[]);
        }
      }

      const malicious = parsed.malicious || [];
      this.maliciousSkills = new Set(malicious);
    } catch {
    }
  }

  private async saveCache() {
    if (!this.signingKey) return;

    const reports: Record<string, AuditReport[]> = {};
    for (const [skillHash, auditList] of this.cacheMap.entries()) {
      reports[skillHash] = auditList;
    }

    const obj = {
      reports,
      malicious: Array.from(this.maliciousSkills),
      timestamp: Date.now(),
    };

    await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  private async verifyAuditorNft(walletAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(this.auditorNftAddress, ABI, this.provider);
      const balance: bigint = await contract.balanceOf(walletAddress);
      return balance > 0n;
    } catch {
      return false;
    }
  }

  private verifyReportSignature(report: AuditReport): boolean {
    const payload = `${report.skill_hash}:${report.auditor}:${report.status}:${JSON.stringify(report.findings)}:${report.timestamp}`;
    const expectedSignature = crypto.createHash('sha256').update(payload).digest('hex');
    return report.signature === expectedSignature;
  }

  async submitAudit(report: AuditReport): Promise<{ success: boolean; error?: string }> {
    try {
      const validated = AuditReportSchema.parse(report);

      const hasAuditorNft = await this.verifyAuditorNft(report.auditor);
      if (!hasAuditorNft) {
        return { success: false, error: "Auditor must hold Auditor NFT" };
      }

      if (!this.verifyReportSignature(validated)) {
        return { success: false, error: "Invalid audit signature" };
      }

      if (!this.cacheMap.has(validated.skill_hash)) {
        this.cacheMap.set(validated.skill_hash, []);
      }

      const existingAudits = this.cacheMap.get(validated.skill_hash)!;

      const existingIndex = existingAudits.findIndex(
        a => a.auditor === validated.auditor && a.skill_hash === validated.skill_hash
      );

      if (existingIndex >= 0) {
        existingAudits[existingIndex] = validated;
      } else {
        existingAudits.push(validated);
      }

      existingAudits.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (validated.status === 'malicious') {
        this.maliciousSkills.add(validated.skill_hash);
      }

      await this.saveCache();

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getAudits(skillHash: string): Promise<AuditReport[]> {
    return this.cacheMap.get(skillHash) || [];
  }

  async isSkillMalicious(skillHash: string): Promise<boolean> {
    return this.maliciousSkills.has(skillHash);
  }

  async queryMaliciousSkills(): Promise<string[]> {
    return Array.from(this.maliciousSkills);
  }

  async getSkillsByAuditor(auditor: string): Promise<Record<string, AuditReport[]>> {
    const result: Record<string, AuditReport[]> = {};

    for (const [skillHash, audits] of this.cacheMap.entries()) {
      const auditorAudits = audits.filter(a => a.auditor === auditor);
      if (auditorAudits.length > 0) {
        result[skillHash] = auditorAudits;
      }
    }

    return result;
  }

  async getAuditSummary(skillHash: string): Promise<{
    total: number;
    safe: number;
    suspicious: number;
    malicious: number;
    uniqueAuditors: number;
  }> {
    const audits = this.cacheMap.get(skillHash) || [];

    const summary = {
      total: audits.length,
      safe: 0,
      suspicious: 0,
      malicious: 0,
      uniqueAuditors: new Set<string>(),
    };

    for (const audit of audits) {
      summary.uniqueAuditors.add(audit.auditor);
      switch (audit.status) {
        case 'safe':
          summary.safe++;
          break;
        case 'suspicious':
          summary.suspicious++;
          break;
        case 'malicious':
          summary.malicious++;
          break;
      }
    }

    return {
      total: summary.total,
      safe: summary.safe,
      suspicious: summary.suspicious,
      malicious: summary.malicious,
      uniqueAuditors: summary.uniqueAuditors.size,
    };
  }

  async getRecentAudits(limit: number = 50): Promise<AuditReport[]> {
    const allAudits: AuditReport[] = [];

    for (const audits of this.cacheMap.values()) {
      allAudits.push(...audits);
    }

    allAudits.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return allAudits.slice(0, limit);
  }

  async exportAuditData(): Promise<string> {
    const data = {
      reports: Object.fromEntries(this.cacheMap),
      malicious: Array.from(this.maliciousSkills),
      exported_at: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  async importAuditData(jsonData: string): Promise<{ success: boolean; imported: number; error?: string }> {
    try {
      const data = JSON.parse(jsonData);

      let imported = 0;
      for (const [skillHash, reports] of Object.entries(data.reports || {})) {
        if (!Array.isArray(reports)) continue;

        for (const report of reports as AuditReport[]) {
          try {
            if (AuditReportSchema.safeParse(report).success) {
              if (!this.cacheMap.has(skillHash)) {
                this.cacheMap.set(skillHash, []);
              }
              this.cacheMap.get(skillHash)!.push(report);
              imported++;
            }
          } catch {
          }
        }
      }

      if (Array.isArray(data.malicious)) {
        for (const hash of data.malicious) {
          this.maliciousSkills.add(hash);
        }
      }

      await this.saveCache();

      return { success: true, imported };
    } catch (error) {
      return { success: false, imported: 0, error: (error as Error).message };
    }
  }
}
