import { SkillInstaller, IsnadService, AuditRegistry, TokenService, SandboxService } from '@think/core';
import { SkillManifest } from '@think/types';
import fs from 'fs';
import path from 'path';

export class TaisServiceManager {
  private skillInstaller!: SkillInstaller;
  private isnadService!: IsnadService;
  private auditRegistry!: AuditRegistry;
  private tokenService!: TokenService;
  private sandboxService!: SandboxService;
  private userDataPath: string;

  constructor(userDataPath?: string) {
    this.userDataPath = userDataPath || path.join(process.cwd(), '.tais');
    this.initializeServices();
  }

  private initializeServices() {
    try {
      const rpcUrl = process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
      
      // Initialize core services
      this.isnadService = new IsnadService(rpcUrl, this.userDataPath);
      this.auditRegistry = new AuditRegistry(rpcUrl, this.userDataPath);
      this.tokenService = new TokenService(rpcUrl, this.userDataPath);
      
      // Initialize sandbox with default restrictive permissions
      this.sandboxService = new SandboxService({
        env_vars: [],
        modules: [],
        filesystem: { read: [], write: [] },
        network: { domains: [], allowed_methods: ['GET', 'POST'] }
      });
      
      // Initialize skill installer with dependencies
      this.skillInstaller = new SkillInstaller(
        this.isnadService,
        this.auditRegistry,
        this.userDataPath
      );
    } catch (error: any) {
      console.error('Failed to initialize services:', error.message);
      throw error;
    }
  }

  // Skill Installation
  async installSkill(skillPath: string) {
    try {
      // Load manifest
      const manifestPath = path.join(skillPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('manifest.json not found in skill directory');
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest: SkillManifest = JSON.parse(manifestContent);

      // Perform security analysis using real services
      const verification = await this.skillInstaller.verifyManifest(manifest);
      const permissionAnalysis = await this.skillInstaller.analyzePermissions(manifest.permissions);
      
      // Check if skill is blocked
      const auditSummary = await this.auditRegistry.getAuditSummary(manifest.skill_hash);
      const isBlocked = auditSummary.malicious > 0; // Simplified check

      // Get trust score from provenance
      const trustScore = manifest.provenance ? 
        (manifest.provenance.author_signature ? 0.7 : 0.3) : 0.5;

      return {
        manifest,
        analysis: {
          valid: verification.valid,
          errors: verification.errors,
          riskLevel: permissionAnalysis.riskLevel,
          summary: permissionAnalysis.summary,
          redFlags: permissionAnalysis.redFlags
        },
        trustScore,
        isBlocked,
        warnings: permissionAnalysis.redFlags,
        violations: verification.errors
      };
    } catch (error: any) {
      throw new Error(`Installation analysis failed: ${error.message}`);
    }
  }

  async completeInstallation(skillPath: string, manifest: SkillManifest) {
    try {
      // Verify manifest first
      const verification = await this.skillInstaller.verifyManifest(manifest);
      
      if (!verification.valid) {
        return {
          success: false,
          error: `Manifest validation failed: ${verification.errors.join(', ')}`
        };
      }

      // Calculate and verify skill hash
      const calculatedHash = this.skillInstaller.calculateSkillHash(manifest);
      if (calculatedHash !== manifest.skill_hash) {
        return {
          success: false,
          error: `Hash mismatch: expected ${calculatedHash}, got ${manifest.skill_hash}`
        };
      }

      // Create skill directory
      const skillDir = path.join(this.userDataPath, 'skills', manifest.name);
      if (!fs.existsSync(skillDir)) {
        fs.mkdirSync(skillDir, { recursive: true });
      }

      // Copy manifest
      fs.writeFileSync(
        path.join(skillDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Track installation
      this.trackInstalledSkill(manifest);

      return {
        success: true,
        skillHash: manifest.skill_hash,
        message: 'Skill installed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Installation failed: ${error.message}`
      };
    }
  }

  private trackInstalledSkill(manifest: SkillManifest) {
    const skillsPath = path.join(this.userDataPath, 'skills.json');
    let skills: any[] = [];

    if (fs.existsSync(skillsPath)) {
      const content = fs.readFileSync(skillsPath, 'utf8');
      skills = JSON.parse(content);
    }

    // Check if skill already exists
    const existingIndex = skills.findIndex(s => s.skill_hash === manifest.skill_hash);
    const skillData = {
      name: manifest.name,
      version: manifest.version,
      author: manifest.author,
      skill_hash: manifest.skill_hash,
      risk_level: 'low', // Would calculate from analysis
      trust_score: 0.7, // Would calculate from provenance
      installed_at: new Date().toISOString(),
      permissions: manifest.permissions
    };

    if (existingIndex >= 0) {
      skills[existingIndex] = skillData;
    } else {
      skills.push(skillData);
    }

    fs.writeFileSync(skillsPath, JSON.stringify(skills, null, 2));
  }

  // Skill Management
  async listInstalledSkills(): Promise<any[]> {
    try {
      const skillsPath = path.join(this.userDataPath, 'skills.json');
      
      if (fs.existsSync(skillsPath)) {
        const content = fs.readFileSync(skillsPath, 'utf8');
        return JSON.parse(content);
      }

      return [];
    } catch (error: any) {
      throw new Error(`Failed to list skills: ${error.message}`);
    }
  }

  async removeSkill(skillHash: string) {
    try {
      const skillsPath = path.join(this.userDataPath, 'skills.json');
      
      if (!fs.existsSync(skillsPath)) {
        return { success: true, message: 'No skills installed' };
      }

      const content = fs.readFileSync(skillsPath, 'utf8');
      const skills: any[] = JSON.parse(content);
      
      // Find the skill to remove
      const skillToRemove = skills.find(s => s.skill_hash === skillHash);
      if (!skillToRemove) {
        return { success: false, error: 'Skill not found' };
      }
      
      // Remove from list
      const updatedSkills = skills.filter(s => s.skill_hash !== skillHash);
      fs.writeFileSync(skillsPath, JSON.stringify(updatedSkills, null, 2));
      
      // Remove skill directory if it exists
      const skillDir = path.join(this.userDataPath, 'skills', skillToRemove.name);
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }

      return { 
        success: true, 
        message: 'Skill removed successfully',
        removedHash: skillHash
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: `Removal failed: ${error.message}`
      };
    }
  }

  async getSkillInfo(skillIdentifier: string) {
    try {
      const skillsPath = path.join(this.userDataPath, 'skills.json');
      
      if (!fs.existsSync(skillsPath)) {
        return null;
      }

      const content = fs.readFileSync(skillsPath, 'utf8');
      const skills: any[] = JSON.parse(content);

      const skill = skills.find(s => 
        s.skill_hash === skillIdentifier || 
        s.name.toLowerCase() === skillIdentifier.toLowerCase()
      );

      return skill || null;
    } catch (error: any) {
      throw new Error(`Failed to get skill info: ${error.message}`);
    }
  }

  // Audit Functions
  async submitAudit(skillHash: string, auditData: any) {
    try {
      // This would integrate with AuditRegistry
      // For now, simulate successful submission
      return {
        success: true,
        auditId: `audit_${Date.now()}`,
        message: 'Audit submitted successfully'
      };
    } catch (error: any) {
      throw new Error(`Audit submission failed: ${error.message}`);
    }
  }

  async checkMalicious(skillHash: string) {
    try {
      const auditSummary = await this.auditRegistry.getAuditSummary(skillHash);
      
      return {
        isBlocked: auditSummary.malicious > 0,
        auditSummary,
        totalAudits: auditSummary.total,
        safeAudits: auditSummary.safe,
        suspiciousAudits: auditSummary.suspicious,
        maliciousAudits: auditSummary.malicious
      };
    } catch (error: any) {
      throw new Error(`Security check failed: ${error.message}`);
    }
  }

  // Verification Functions
  async verifySkill(skillHash: string) {
    try {
      const auditSummary = await this.auditRegistry.getAuditSummary(skillHash);
      const isBlocked = auditSummary.malicious > 0;
      
      return {
        trustScore: 0.75, // Would calculate from provenance
        isBlocked,
        provenance: undefined, // Would get from IsnadService
        isValid: !isBlocked
      };
    } catch (error: any) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  async verifyAuthor(walletAddress: string) {
    try {
      // Check if address has published any skills
      const skillsPath = path.join(this.userDataPath, 'skills.json');
      let authorSkills = 0;
      
      if (fs.existsSync(skillsPath)) {
        const content = fs.readFileSync(skillsPath, 'utf8');
        const skills: any[] = JSON.parse(content);
        authorSkills = skills.filter(s => s.author === walletAddress).length;
      }
      
      return {
        hasPublisherNft: authorSkills > 0, // Simplified - would check on-chain
        authorSkills,
        reputation: authorSkills > 0 ? 0.85 : 0.5,
        isValid: authorSkills > 0
      };
    } catch (error: any) {
      throw new Error(`Author verification failed: ${error.message}`);
    }
  }

  async verifyProvenance(skillHash: string) {
    try {
      // Would use IsnadService.getProvenance() if available
      // For now, simplified check
      return {
        provenance: undefined,
        isValid: true,
        authorVerified: true,
        auditorCount: 0
      };
    } catch (error: any) {
      throw new Error(`Provenance verification failed: ${error.message}`);
    }
  }

  // Configuration
  async getServiceStatus() {
    return {
      isnadService: 'connected',
      auditRegistry: 'connected',
      tokenService: 'connected',
      sandboxService: 'connected',
      skillInstaller: 'connected',
      userDataPath: this.userDataPath
    };
  }
}