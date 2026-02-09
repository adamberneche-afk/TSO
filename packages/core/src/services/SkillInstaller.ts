import { ethers } from 'ethers';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { SkillManifest, Permission, IsnadLink, AuditReport } from '@think/types';
import { IsnadService } from './IsnadService';
import { AuditRegistry } from './AuditRegistry';
import { SandboxService } from './SandboxService';
import { TokenService } from './TokenService';

const MAX_SKILL_SIZE_BYTES = 1024 * 1024;

interface SkillInstallResult {
  success: boolean;
  skillHash?: string;
  error?: string;
  warnings?: string[];
  violations?: any[];
}

interface SkillInfo {
  manifest: SkillManifest;
  trustScore: number;
  auditSummary: any;
  violations: any[];
}

export class SkillInstaller {
  private isnadService: IsnadService;
  private auditRegistry: AuditRegistry;
  private tokenService: TokenService;
  private skillsPath: string;

  constructor(
    isnadService: IsnadService,
    auditRegistry: AuditRegistry,
    userDataPath: string
  ) {
    this.isnadService = isnadService;
    this.auditRegistry = auditRegistry;
    this.tokenService = new TokenService(process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo', userDataPath);
    this.skillsPath = path.join(userDataPath, 'skills');
    this.ensureSkillsDirectory();
  }

  private async ensureSkillsDirectory() {
    await fs.mkdir(this.skillsPath, { recursive: true });
  }

  calculateSkillHash(manifest: SkillManifest): string {
    const manifestStr = JSON.stringify(manifest, Object.keys(manifest).sort());
    return crypto.createHash('sha256').update(manifestStr).digest('hex');
  }

  async verifyManifest(manifest: SkillManifest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!manifest.name || manifest.name.length === 0) {
      errors.push('Skill name is required');
    }

    if (!manifest.version || manifest.version.length === 0) {
      errors.push('Skill version is required');
    }

    if (!manifest.author || !/^0x[a-fA-F0-9]{40}$/.test(manifest.author)) {
      errors.push('Invalid author wallet address');
    }

    if (!manifest.provenance || !manifest.provenance.author_signature) {
      errors.push('Provenance and author signature are required');
    }

    const expectedHash = this.calculateSkillHash(manifest);
    if (manifest.skill_hash !== expectedHash) {
      errors.push(`Skill hash mismatch: expected ${expectedHash}, got ${manifest.skill_hash}`);
    }

    const provenanceValid = await this.isnadService.verifyProvenance(manifest.provenance);
    if (!provenanceValid) {
      errors.push('Invalid provenance signature');
    }

    if (manifest.permissions.network?.domains && manifest.permissions.network.domains.includes('webhook.site')) {
      errors.push('CRITICAL: Skill requests webhook.site domain access - potential exfiltration');
    }

        if (manifest.permissions.env_vars && manifest.permissions.env_vars.includes('.env')) {
          errors.push('CRITICAL: Skill requests access to .env file - potential credential theft');
        }

        // Check for minimum THINK token requirements
        const minTokens = '10'; // Minimum 10 THINK tokens to publish skills
        const tokenVerification = await this.tokenService.verifyMinThinkTokens(minTokens, manifest.author);
        if (!tokenVerification) {
          errors.push(`SKILL_PUBLISHER_GATE: Author must hold minimum ${minTokens} THINK tokens to publish skills`);
        }

    if (manifest.permissions.filesystem?.read?.some(p => p.includes('.env'))) {
      errors.push('CRITICAL: Skill requests access to .env files - potential credential theft');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async analyzePermissions(permissions: Permission): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    summary: string[];
    redFlags: string[];
  }> {
    const redFlags: string[] = [];
    const summary: string[] = [];
    let riskScore = 0;

    if (permissions.network?.domains) {
      summary.push(`Network access to ${permissions.network.domains.length} domain(s)`);

      const dangerousDomains = ['webhook.site', 'pastebin.com', 'ngrok.io'];
      for (const domain of permissions.network.domains) {
        if (dangerousDomains.some(d => domain.includes(d))) {
          redFlags.push(`Requests access to ${domain} (data exfiltration risk)`);
          riskScore += 30;
        }
      }

      if (permissions.network.domains.length > 5) {
        redFlags.push(`Requests network access to ${permissions.network.domains.length} domains (high attack surface)`);
        riskScore += 10;
      }
    }

    if (permissions.env_vars && permissions.env_vars.length > 0) {
      summary.push(`Access to ${permissions.env_vars.length} environment variable(s)`);

      for (const envVar of permissions.env_vars) {
        if (envVar.toLowerCase().includes('key') || envVar.toLowerCase().includes('secret')) {
          redFlags.push(`Requests access to ${envVar} (credential access)`);
          riskScore += 20;
        }
      }

      if (permissions.env_vars.length > 3) {
        redFlags.push(`Requests access to many environment variables (${permissions.env_vars.length})`);
        riskScore += 10;
      }
    }

    if (permissions.filesystem?.read && permissions.filesystem.read.length > 0) {
      summary.push(`Read access to ${permissions.filesystem.read.length} path(s)`);

      for (const filePath of permissions.filesystem.read) {
        if (filePath.includes('.env') || filePath.includes('credential') || filePath.includes('secret')) {
          redFlags.push(`Requests read access to ${filePath} (credential access)`);
          riskScore += 25;
        }
      }
    }

    if (permissions.filesystem?.write && permissions.filesystem.write.length > 0) {
      summary.push(`Write access to ${permissions.filesystem.write.length} path(s)`);
      riskScore += 5;
    }

    if (!permissions.network && !permissions.env_vars && !permissions.filesystem) {
      summary.push('No special permissions requested');
      riskScore = 0;
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 50) {
      riskLevel = 'critical';
    } else if (riskScore >= 30) {
      riskLevel = 'high';
    } else if (riskScore >= 15) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return { riskLevel, summary, redFlags };
  }

  async getSkillInfo(manifest: SkillManifest): Promise<SkillInfo> {
    const skillHash = this.calculateSkillHash(manifest);
    
    // Calculate enhanced trust score including THINK tokens
    const enhancedTrustScore = await this.isnadService.calculateTrustScore(
      manifest.provenance.auditors, 
      manifest.author
    );

    const audits = await this.auditRegistry.getAudits(skillHash);
    const auditSummary = await this.auditRegistry.getAuditSummary(skillHash);

    const sandbox = new SandboxService(manifest.permissions);
    const violations = sandbox.getViolations();

    return {
      manifest,
      trustScore: enhancedTrustScore,
      auditSummary,
      violations,
    };
  }

  async installSkill(
    manifest: SkillManifest,
    skillCode: string
  ): Promise<SkillInstallResult> {
    try {
      const manifestSize = Buffer.byteLength(JSON.stringify(manifest), 'utf8');
      if (manifestSize > MAX_SKILL_SIZE_BYTES) {
        return {
          success: false,
          error: `Manifest too large: ${manifestSize} bytes (max: ${MAX_SKILL_SIZE_BYTES})`,
        };
      }

      const codeSize = Buffer.byteLength(skillCode, 'utf8');
      if (codeSize > MAX_SKILL_SIZE_BYTES) {
        return {
          success: false,
          error: `Skill code too large: ${codeSize} bytes (max: ${MAX_SKILL_SIZE_BYTES})`,
        };
      }

      const verification = await this.verifyManifest(manifest);
      if (!verification.valid) {
        return {
          success: false,
          error: `Manifest verification failed: ${verification.errors.join(', ')}`,
        };
      }

      const skillHash = this.calculateSkillHash(manifest);

      const isMalicious = await this.auditRegistry.isSkillMalicious(skillHash);
      if (isMalicious) {
        return {
          success: false,
          error: 'Skill has been flagged as malicious by community auditors',
        };
      }

      const permissionAnalysis = await this.analyzePermissions(manifest.permissions);
      if (permissionAnalysis.riskLevel === 'critical') {
        return {
          success: false,
          error: `Critical security risk detected: ${permissionAnalysis.redFlags.join(', ')}`,
          warnings: permissionAnalysis.redFlags,
        };
      }

      const skillDir = path.join(this.skillsPath, manifest.name);
      await fs.mkdir(skillDir, { recursive: true });

      const manifestPath = path.join(skillDir, 'manifest.json');
      const codePath = path.join(skillDir, 'skill.js');
      const permissionsPath = path.join(skillDir, 'permissions.json');

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      await fs.writeFile(codePath, skillCode, 'utf-8');
      await fs.writeFile(permissionsPath, JSON.stringify(manifest.permissions, null, 2), 'utf-8');

      const sandbox = new SandboxService(manifest.permissions);
      const testResult = await sandbox.executeSkill('// Test execution', 1000);

      return {
        success: true,
        skillHash,
        warnings: permissionAnalysis.redFlags,
        violations: testResult.violations,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async uninstallSkill(skillName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const skillDir = path.join(this.skillsPath, skillName);

      try {
        await fs.access(skillDir);
      } catch {
        return { success: false, error: `Skill '${skillName}' not found` };
      }

      await fs.rm(skillDir, { recursive: true, force: true });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async listInstalledSkills(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.skillsPath);
      return entries.filter(async (entry) => {
        const stat = await fs.stat(path.join(this.skillsPath, entry));
        return stat.isDirectory();
      });
    } catch {
      return [];
    }
  }

  async getInstalledSkillManifest(skillName: string): Promise<SkillManifest | null> {
    try {
      const manifestPath = path.join(this.skillsPath, skillName, 'manifest.json');
      const data = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(data) as SkillManifest;
    } catch {
      return null;
    }
  }
}
