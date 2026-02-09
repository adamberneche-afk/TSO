import { UserProfile } from '@think/types';
import { InterviewConfig } from '@think/types';
import { SkillManifest } from '@think/types';
import { AuditReport } from '@think/types';
import { TokenBalance } from '@think/types';
import { TokenHolding } from '@think/types';

export interface TaisApi {
  loadProfile: () => Promise<UserProfile | null>;
  exists: () => Promise<boolean>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  startInterview: (config: InterviewConfig, walletAddress: string) => Promise<{success: boolean, message?: string, error?: string}>;
  cleanupSession: () => void;

  installSkill: (manifest: SkillManifest, skillCode: string) => Promise<{success: boolean, error?: string, skillHash?: string, warnings?: string[]}>;
  uninstallSkill: (skillName: string) => Promise<{success: boolean, error?: string}>;
  listSkills: () => Promise<string[]>;
  getSkillInfo: (skillName: string) => Promise<any>;
  submitSkillAudit: (report: AuditReport) => Promise<{success: boolean, error?: string}>;
  checkSkillMalicious: (skillHash: string) => Promise<boolean>;

  // THINK Token APIs
  getTokenBalance: (walletAddress: string) => Promise<{ success: boolean; balance?: TokenBalance; error?: string }>;
  getTokenHoldings: (walletAddress: string) => Promise<{ success: boolean; holdings?: TokenHolding; error?: string }>;
  verifyMinTokens: (walletAddress: string, minAmount: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
  getTokenInfo: () => Promise<{ success: boolean; tokenInfo?: any; error?: string }>;
}

declare global {
  interface Window {
    taisAPI: TaisApi;
  }
}

export {};
