import { UserProfile } from '@think/types';
import { InterviewConfig } from '@think/types';
import { SkillManifest } from '@think/types';
import { AuditReport } from '@think/types';
import { getRegistryBaseUrl, getRegistryAuthToken } from './registryConfig';

export { configureRegistry } from './registryConfig';

class ProfileAdapter {
  isElectronRenderer(): boolean {
    return typeof window !== 'undefined' && !!(window as any).taisAPI;
  }

  async exists(): Promise<boolean> {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.exists();
    } else {
      return false;
    }
  }

  async load(): Promise<UserProfile | null> {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.loadProfile();
    }
    return null;
  }

  async save(profile: UserProfile): Promise<void> {
    if (this.isElectronRenderer()) {
      await (window as any).taisAPI.saveProfile(profile);
    }
  }
}

class SkillAdapter {
  isElectronRenderer(): boolean {
    return typeof window !== 'undefined' && !!(window as any).taisAPI;
  }

  async install(manifest: SkillManifest, skillCode: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.installSkill(manifest, skillCode);
    }
    // Real security scan via the registry's POST /api/v1/scan (mounted
    // and YARA-backed for real as of the 2026-09 remediation pass -- see
    // docs/DOCS_VS_CODEBASE.md row 5). Requires an authenticated caller;
    // a host with no token configured (see configureRegistry) gets a
    // clear error here instead of the previous unconditional
    // "Not in Electron environment" regardless of whether it could have
    // actually reached the registry.
    const token = getRegistryAuthToken();
    if (!token) {
      return { success: false, error: 'No registry auth token configured -- call configureRegistry({ authToken }) first' };
    }
    try {
      const res = await fetch(`${getRegistryBaseUrl()}/api/v1/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: skillCode, encoding: 'utf8', filename: manifest.name }),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body.error || `Scan failed with status ${res.status}` };
      }
      return {
        success: body.success !== false,
        skillHash: manifest.skill_hash,
        warnings: (body.findings || []).map((f: any) => `${f.rule} (${f.severity})`),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async uninstall(skillName: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.uninstallSkill(skillName);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async list(): Promise<string[]> {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.listSkills();
    }
    return [];
  }

  async getInfo(skillName: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getSkillInfo(skillName);
    }
    return null;
  }

  async submitAudit(report: AuditReport) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.submitSkillAudit(report);
    }
    // The report is already signed by the caller's own wallet (that's
    // why this takes a complete AuditReport rather than raw fields) --
    // this just needs to reach the real POST /api/v1/audits, same as
    // packages/cli/src/services/RegistryClient.ts's submitAudit.
    const token = getRegistryAuthToken();
    if (!token) {
      return { success: false, error: 'No registry auth token configured -- call configureRegistry({ authToken }) first' };
    }
    try {
      const res = await fetch(`${getRegistryBaseUrl()}/api/v1/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(report),
      });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: body.message || body.error || `Registry returned ${res.status}` };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

   async checkMalicious(skillHash: string): Promise<boolean> {
     if (this.isElectronRenderer()) {
       return await (window as any).taisAPI.checkSkillMalicious(skillHash);
     }
     // GET /api/v1/audits/:skillHash is public (no auth required), so
     // this works for any non-Electron host with zero configuration --
     // previously this branch was a hardcoded `false` regardless of
     // what the community registry actually knew about this skill (see
     // docs/DOCS_VS_CODEBASE.md row 7).
     try {
       const res = await fetch(`${getRegistryBaseUrl()}/api/v1/audits/${skillHash}`);
       if (!res.ok) return false; // includes 404: registry has never heard of this skill
       const body: any = await res.json();
       return !!body.skill?.isBlocked;
     } catch {
       return false;
     }
   }

    async askQuestion(questionId: string, context: string, userAnswer: string, sessionId: number) {
      if (this.isElectronRenderer()) {
        return await (window as any).taisAPI.askQuestion(questionId, context, userAnswer, sessionId);
      }
      return { success: false, error: 'Not in Electron environment' };
    }

    async cloneAgent(sessionId: number) {
      if (this.isElectronRenderer()) {
        return await (window as any).taisAPI.cloneAgent(sessionId);
      }
      return { success: false, error: 'Not in Electron environment' };
    }

    async updateExpertise(sessionId: number, updates: Partial<InterviewConfig>) {
      if (this.isElectronRenderer()) {
        return await (window as any).taisAPI.updateExpertise(sessionId, updates);
      }
      return { success: false, error: 'Not in Electron environment' };
    }

    async updateValues(sessionId: number, updates: Partial<UserProfile>) {
      if (this.isElectronRenderer()) {
        return await (window as any).taisAPI.updateValues(sessionId, updates);
      }
      return { success: false, error: 'Not in Electron environment' };
    }

  // THINK Token methods
  async getTokenBalance(walletAddress: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getTokenBalance(walletAddress);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async getTokenHoldings(walletAddress: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getTokenHoldings(walletAddress);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async verifyMinTokens(walletAddress: string, minAmount: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.verifyMinTokens(walletAddress, minAmount);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async getTokenInfo() {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getTokenInfo();
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  // Staking methods
  async getStakingInfo(walletAddress: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getStakingInfo(walletAddress);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async getCombinedStakingInfo(walletAddress: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getCombinedStakingInfo(walletAddress);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async verifyStakingRequirements(walletAddress: string, minStakeAmount: string) {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.verifyStakingRequirements(walletAddress, minStakeAmount);
    }
    return { success: false, error: 'Not in Electron environment' };
  }

  async getStakingStats() {
    if (this.isElectronRenderer()) {
      return await (window as any).taisAPI.getStakingStats();
    }
    return { success: false, error: 'Not in Electron environment' };
  }
}

export const profileSDK = new ProfileAdapter();
export const loadUserProfile = () => profileSDK.load();
export const profileExists = () => profileSDK.exists();
export const saveProfile = (p: UserProfile) => profileSDK.save(p);

export const skillSDK = new SkillAdapter();
export const installSkill = (manifest: SkillManifest, code: string) => skillSDK.install(manifest, code);
export const uninstallSkill = (name: string) => skillSDK.uninstall(name);
export const listSkills = () => skillSDK.list();
export const getSkillInfo = (name: string) => skillSDK.getInfo(name);
export const submitSkillAudit = (report: AuditReport) => skillSDK.submitAudit(report);
export const checkSkillMalicious = (hash: string) => skillSDK.checkMalicious(hash);
export const askQuestion = (questionId: string, context: string, userAnswer: string, sessionId: number) => skillSDK.askQuestion(questionId, context, userAnswer, sessionId);
export const cloneAgent = (sessionId: number) => skillSDK.cloneAgent(sessionId);
export const updateExpertise = (sessionId: number, updates: Partial<InterviewConfig>) => skillSDK.updateExpertise(sessionId, updates);
export const updateValues = (sessionId: number, updates: Partial<UserProfile>) => skillSDK.updateValues(sessionId, updates);

// THINK Token SDK exports
export const getTokenBalance = (wallet: string) => skillSDK.getTokenBalance(wallet);
export const getTokenHoldings = (wallet: string) => skillSDK.getTokenHoldings(wallet);
export const verifyMinTokens = (wallet: string, minAmount: string) => skillSDK.verifyMinTokens(wallet, minAmount);
export const getTokenInfo = () => skillSDK.getTokenInfo();

// Staking SDK exports
export const getStakingInfo = (wallet: string) => skillSDK.getStakingInfo(wallet);
export const getCombinedStakingInfo = (wallet: string) => skillSDK.getCombinedStakingInfo(wallet);
export const verifyStakingRequirements = (wallet: string, minAmount: string) => skillSDK.verifyStakingRequirements(wallet, minAmount);
export const getStakingStats = () => skillSDK.getStakingStats();
