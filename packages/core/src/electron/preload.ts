import { contextBridge, ipcRenderer } from 'electron';
import { UserProfile } from '@think/types';
import { InterviewConfig } from '@think/types';
import { SkillManifest } from '@think/types';
import { AuditReport } from '@think/types';
import { TokenBalance } from '@think/types';
import { TokenHolding } from '@think/types';
import { StakingInfo } from '@think/types';
import { CombinedStakingInfo } from '@think/types';

const taisAPI = {
  loadProfile: (): Promise<UserProfile | null> => ipcRenderer.invoke('tais:load-profile'),
  exists: (): Promise<boolean> => ipcRenderer.invoke('tais:exists'),
  saveProfile: (profile: UserProfile) => ipcRenderer.invoke('tais:save-profile', profile),
  startInterview: (config: InterviewConfig, walletAddress: string) =>
    ipcRenderer.invoke('tais:start-interview', config, walletAddress),
  updateExpertise: (sessionId: number, updates: Partial<InterviewConfig>) =>
    ipcRenderer.invoke('tais:update-expertise', sessionId, updates),
  updateValues: (sessionId: number, updates: Partial<UserProfile>) =>
    ipcRenderer.invoke('tais:update-values', sessionId, updates),
  askQuestion: (questionId: string, context: string, userAnswer: string, sessionId: number) =>
    ipcRenderer.invoke('tais:askQuestion', questionId, context, userAnswer, sessionId),
  cloneAgent: (sessionId: number) => ipcRenderer.invoke('tais:clone-agent', sessionId),
  cleanupSession: (sessionId: number) => ipcRenderer.invoke('tais:cleanup-session', sessionId),

  installSkill: (manifest: SkillManifest, skillCode: string) =>
    ipcRenderer.invoke('tais:install-skill', manifest, skillCode),
  uninstallSkill: (skillName: string) =>
    ipcRenderer.invoke('tais:uninstall-skill', skillName),
  listSkills: () => ipcRenderer.invoke('tais:list-skills'),
  getSkillInfo: (skillName: string) =>
    ipcRenderer.invoke('tais:get-skill-info', skillName),
  submitSkillAudit: (report: AuditReport) =>
    ipcRenderer.invoke('tais:submit-audit', report),
  checkSkillMalicious: (skillHash: string) =>
    ipcRenderer.invoke('tais:check-malicious', skillHash),

  // THINK Token APIs
  getTokenBalance: (walletAddress: string) => ipcRenderer.invoke('tais:get-token-balance', walletAddress),
  getTokenHoldings: (walletAddress: string) => ipcRenderer.invoke('tais:get-token-holdings', walletAddress),
  verifyMinTokens: (walletAddress: string, minAmount: string) => ipcRenderer.invoke('tais:verify-min-tokens', walletAddress, minAmount),
  getTokenInfo: () => ipcRenderer.invoke('tais:get-token-info'),

  // Staking APIs
  getStakingInfo: (walletAddress: string) => ipcRenderer.invoke('tais:get-staking-info', walletAddress),
  getCombinedStakingInfo: (walletAddress: string) => ipcRenderer.invoke('tais:get-combined-staking-info', walletAddress),
  verifyStakingRequirements: (walletAddress: string, minStakeAmount: string) => ipcRenderer.invoke('tais:verify-staking-requirements', walletAddress, minStakeAmount),
  getStakingStats: () => ipcRenderer.invoke('tais:get-staking-stats'),
};

contextBridge.exposeInMainWorld('taisAPI', taisAPI);

export type TaisApi = typeof taisAPI;
