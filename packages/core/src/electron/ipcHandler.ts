import { ipcMain, app } from 'electron';
import { FileSystemService } from '../services/FileSystemService';
import { UserProfileSchema, UserProfile } from '@think/types';
import { TelemetryService } from '../services/TelemetryService';
import { MOCK_PROFILE } from '../services/MockProfileService';
import { InterviewAgent } from '../services/InterviewAgent';
import { InterviewConfig } from '@think/types';
import { NftService } from '../services/NftService';
import { IsnadService } from '../services/IsnadService';
import { AuditRegistry } from '../services/AuditRegistry';
import { SkillInstaller } from '../services/SkillInstaller';
import { TokenService } from '../services/TokenService';
import { StakingService } from '../services/StakingService';
import { SkillManifest } from '@think/types';
import { AuditReport } from '@think/types';

const MAX_PROFILE_SIZE_BYTES = 500 * 1024;
const MAX_CONCURRENT_SESSIONS = 10;

const telemetry = new TelemetryService();
const fsService = new FileSystemService(app);
const nftService = new NftService(
  process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  app.getPath('userData')
);

const tokenService = new TokenService(
  process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  app.getPath('userData')
);

const stakingService = new StakingService(
  process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  app.getPath('userData')
);

const isnadService = new IsnadService(
  process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  app.getPath('userData')
);

const auditRegistry = new AuditRegistry(
  process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
  app.getPath('userData')
);

const skillInstaller = new SkillInstaller(isnadService, auditRegistry, app.getPath('userData'));

const activeSessions = new Map<number, { agent: InterviewAgent, config: InterviewConfig }>();

app.on('window-all-closed', () => {
  activeSessions.clear();
});

export const registerProfileIpcHandlers = () => {
  ipcMain.handle('tais:start-interview', async (event, config: InterviewConfig, walletAddress: string) => {
    try {
      if (!walletAddress) return { success: false, error: "MISSING_WALLET_ADDRESS" };

      const hasGenesisNft = await nftService.verifyOwnership(walletAddress);
      if (!hasGenesisNft) {
        return { success: false, error: "GENESIS_NFT_REQUIRED", message: "Exclusive to Genesis NFT holders." };
      }

      if (activeSessions.size >= MAX_CONCURRENT_SESSIONS) {
        return {
          success: false,
          error: "SESSION_LIMIT_REACHED",
          message: "Too many concurrent interview sessions. Please restart the app."
        };
      }

      const agent = new InterviewAgent(config);
      const isHealthy = await (agent as any).provider.healthCheck();

      if (!isHealthy) {
        return { success: false, error: "LLM_UNAVAILABLE", message: "AI Provider unreachable." };
      }

      activeSessions.set(event.sender.id, { agent, config });
      return { success: true, message: "Interview initialized" };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('tais:cleanup-session', (event) => {
    activeSessions.delete(event.sender.id);
  });

  ipcMain.handle('tais:load-profile', async (): Promise<UserProfile | null> => {
    const isDevMode = process.env.DEV_MODE === 'true' || app.isPackaged === false;

    try {
      const rawProfile = await fsService.read();
      if (!rawProfile) {
        if (isDevMode) return MOCK_PROFILE;
        return null;
      }
      const validated = UserProfileSchema.parse(rawProfile);
      return validated;
    } catch (error: any) {
      if (isDevMode && error.code === 'ENOENT') return MOCK_PROFILE;
      throw error;
    }
  });

  ipcMain.handle('tais:save-profile', async (_event, profile: UserProfile) => {
    try {
      const validated = UserProfileSchema.parse(profile);
      const size = Buffer.byteLength(JSON.stringify(validated), 'utf8');
      if (size > MAX_PROFILE_SIZE_BYTES) {
        throw new Error(`Payload too large: ${size} bytes.`);
      }
      await fsService.write(validated);
      await telemetry.trackProfileCreated(validated);
      return { success: true, size };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('tais:install-skill', async (_event, manifest: SkillManifest, skillCode: string) => {
    try {
      const result = await skillInstaller.installSkill(manifest, skillCode);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:uninstall-skill', async (_event, skillName: string) => {
    try {
      const result = await skillInstaller.uninstallSkill(skillName);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:list-skills', async () => {
    try {
      const skills = await skillInstaller.listInstalledSkills();
      return skills;
    } catch (error) {
      console.error('Error listing skills:', error);
      return [];
    }
  });

  ipcMain.handle('tais:get-skill-info', async (_event, skillName: string) => {
    try {
      const manifest = await skillInstaller.getInstalledSkillManifest(skillName);
      if (!manifest) {
        return { success: false, error: `Skill '${skillName}' not found` };
      }
      const info = await skillInstaller.getSkillInfo(manifest);
      return { success: true, info };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:get-token-balance', async (_event, walletAddress: string) => {
    try {
      const balance = await tokenService.getTokenBalance(walletAddress);
      return { success: true, balance };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:get-token-holdings', async (_event, walletAddress: string) => {
    try {
      const holdings = await tokenService.getTokenHoldings(walletAddress);
      return { success: true, holdings };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:verify-min-tokens', async (_event, walletAddress: string, minAmount: string) => {
    try {
      const verification = await tokenService.verifyMinThinkTokens(minAmount, walletAddress);
      return { success: true, verification };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:get-token-info', async () => {
    try {
      const tokenInfo = await tokenService.getTokenInfo();
      return { success: true, tokenInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Staking-related handlers
  ipcMain.handle('tais:get-staking-info', async (_event, walletAddress: string) => {
    try {
      const stakingInfo = await stakingService.getStakingInfo(walletAddress);
      return { success: true, stakingInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:get-combined-staking-info', async (_event, walletAddress: string) => {
    try {
      const combinedInfo = await stakingService.getCombinedStakingInfo(walletAddress);
      return { success: true, combinedInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:verify-staking-requirements', async (_event, walletAddress: string, minStakeAmount: string) => {
    try {
      const verification = await stakingService.verifyStakingRequirements(minStakeAmount, walletAddress);
      return { success: true, verification };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:get-staking-stats', async () => {
    try {
      const stats = await stakingService.getStakingStats();
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:submit-audit', async (_event, report: AuditReport) => {
    try {
      const result = await auditRegistry.submitAudit(report);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('tais:check-malicious', async (_event, skillHash: string) => {
    try {
      const isMalicious = await auditRegistry.isSkillMalicious(skillHash);
      return isMalicious;
    } catch (error) {
      console.error('Error checking malicious status:', error);
      return false;
    }
  });

  ipcMain.handle('tais:askQuestion', async (_event, questionId: string, context: string, userAnswer: string, sessionId: number) => {
    try {
      const session = activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: "SESSION_NOT_FOUND" };
      }

      const result = await session.agent.askQuestion(questionId, context, userAnswer);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};