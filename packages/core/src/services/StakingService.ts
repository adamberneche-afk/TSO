import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { ethers } from 'ethers';
import { TokenBalance, TokenType } from '@think/types';

// Contract addresses
const THINK_TOKEN_ADDRESS = '0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465';
const THINK_STAKING_ADDRESS = '0x08071901A5C4D2950888Ce2b299bBd0e3087d101';

// ERC-20 ABI (for THINK token)
const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Staking ABI (basic staking functions)
const STAKING_ABI = [
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function getStaked(address user) view returns (uint256)',
  'function getRewards(address user) view returns (uint256)',
  'function getTotalStaked() view returns (uint256)',
  'function stakeOfEpoch(address user) view returns (uint256)',
  'function currentEpoch() view returns (uint256)',
  'function epochDuration() view returns (uint256)',
  'function rewardRate() view returns (uint256)'
];

interface CacheEntry {
  balance: string;
  decimals: number;
  symbol: string;
  staked: string;
  rewards: string;
  timestamp: number;
  signature?: string;
}

interface StakingInfo {
  stakedAmount: string;
  rewardsAmount: string;
  currentEpoch: number;
  totalStaked: string;
  canUnstake: boolean;
  unstakePenalty: number;
}

export class StakingService {
  private provider: ethers.Provider;
  private cachePath: string;
  private cacheMap: Map<string, CacheEntry> = new Map();
  private signingKey: string | null = null;

  constructor(rpcUrl: string, userDataPath: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.cachePath = path.join(userDataPath, '.staking_cache.json');
    this.ensureSigningKey();
    this.loadCache();
    
    console.log(`🔒 StakingService initialized:`);
    console.log(`   THINK Token: ${THINK_TOKEN_ADDRESS}`);
    console.log(`   Staking Contract: ${THINK_STAKING_ADDRESS}`);
    console.log(`   Cache Path: ${this.cachePath}`);
  }

  private async ensureSigningKey() {
    try {
      const secretPath = path.join(path.dirname(this.cachePath), '.staking_secret');
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
      console.error('Failed to initialize Staking signing key. Caching disabled.', error);
      this.signingKey = null;
    }
  }

  private async loadCache() {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const parsed = JSON.parse(data);
      const validMap = new Map<string, CacheEntry>();
      for (const [walletAddress, entry] of Object.entries(parsed)) {
        if (this.verifyCacheEntry(walletAddress, entry as CacheEntry)) {
          validMap.set(walletAddress, entry as CacheEntry);
        }
      }
      this.cacheMap = validMap;
    } catch {
    }
  }

  private verifyCacheEntry(walletAddress: string, entry: CacheEntry): boolean {
    if (!this.signingKey || !entry.signature) return false;
    const payload = `${entry.balance}:${entry.decimals}:${entry.symbol}:${entry.staked}:${entry.rewards}:${entry.timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(entry.signature));
  }

  private signCacheEntry(entry: CacheEntry): string {
    if (!this.signingKey) throw new Error("Signing Key Missing");
    const timestamp = Date.now();
    const payload = `${entry.balance}:${entry.decimals}:${entry.symbol}:${entry.staked}:${entry.rewards}:${timestamp}`;
    return crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
  }

  private async saveCache() {
    if (!this.signingKey) return;
    const obj: Record<string, any> = {};
    for (const [walletAddress, entry] of this.cacheMap.entries()) {
      entry.signature = this.signCacheEntry(entry);
      entry.timestamp = Date.now();
      obj[walletAddress] = entry;
    }
    await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  async getTokenBalance(walletAddress: string): Promise<TokenBalance | null> {
    try {
      const contract = new ethers.Contract(THINK_TOKEN_ADDRESS, TOKEN_ABI, this.provider);
      
      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol(),
        contract.name()
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return {
        tokenAddress: THINK_TOKEN_ADDRESS,
        tokenType: 'ERC20' as TokenType,
        balance: formattedBalance,
        decimals: Number(decimals),
        symbol: symbol as string
      };
    } catch (error) {
      console.error(`Token balance check failed for ${walletAddress}:`, error);
      return null;
    }
  }

  async getStakingInfo(walletAddress: string): Promise<StakingInfo | null> {
    try {
      const contract = new ethers.Contract(THINK_STAKING_ADDRESS, STAKING_ABI, this.provider);
      
      const [staked, rewards, currentEpoch, totalStaked] = await Promise.all([
        contract.getStaked(walletAddress),
        contract.getRewards(walletAddress),
        contract.currentEpoch(),
        contract.getTotalStaked()
      ]);

      const stakedAmount = ethers.formatUnits(staked, 18);
      const rewardsAmount = ethers.formatUnits(rewards, 18);
      const totalStakedAmount = ethers.formatUnits(totalStaked, 18);

      // Check if user can unstake (basic implementation)
      const canUnstake = true; // This could be enhanced with unstaking periods
      const unstakePenalty = 0; // Could be implemented based on staking duration

      return {
        stakedAmount,
        rewardsAmount,
        currentEpoch: Number(currentEpoch),
        totalStaked: totalStakedAmount,
        canUnstake,
        unstakePenalty
      };
    } catch (error) {
      console.error(`Staking info check failed for ${walletAddress}:`, error);
      return null;
    }
  }

  async verifyStakingRequirements(minStakeAmount: string, walletAddress: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const stakingInfo = await this.getStakingInfo(walletAddress);
      if (!stakingInfo) {
        return { valid: false, error: "Unable to verify staking requirements" };
      }

      const tokenBalance = await this.getTokenBalance(walletAddress);
      if (!tokenBalance) {
        return { valid: false, error: "Unable to check token balance" };
      }

      const availableBalance = ethers.parseUnits(tokenBalance.balance, tokenBalance.decimals || 18);
      const requiredStake = ethers.parseUnits(minStakeAmount, 18);
      
      if (BigInt(availableBalance) < BigInt(requiredStake)) {
        return { valid: false, error: `Insufficient balance. Required: ${minStakeAmount}, Available: ${tokenBalance.balance}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  calculateStakingWeight(walletAddress: string): number {
    const cacheEntry = this.cacheMap.get(walletAddress);
    if (!cacheEntry) return 0;

    try {
      const stakedAmount = BigInt(ethers.parseUnits(cacheEntry.staked || "0", 18));
      
      // Staking weight calculation (0.0 - 1.0 scale)
      if (stakedAmount >= BigInt(ethers.parseUnits("10000", 18))) {
        return 1.0; // Maximum staking weight for whales
      } else if (stakedAmount >= BigInt(ethers.parseUnits("1000", 18))) {
        return 0.8; // High staking weight for large stakers
      } else if (stakedAmount >= BigInt(ethers.parseUnits("100", 18))) {
        return 0.6; // Medium staking weight for medium stakers
      } else if (stakedAmount > BigInt(0)) {
        return 0.4; // Low staking weight for small stakers
      } else {
        return 0.0; // No staking weight
      }
    } catch {
      return 0.0;
    }
  }

  async getCombinedStakingInfo(walletAddress: string): Promise<{
    tokenBalance: TokenBalance | null;
    stakingInfo: StakingInfo | null;
    totalWeight: number;
    canSkillPublish: boolean;
  }> {
    try {
      const [tokenBalance, stakingInfo] = await Promise.all([
        this.getTokenBalance(walletAddress),
        this.getStakingInfo(walletAddress)
      ]);

      const tokenWeight = 0.3; // Token balance weight
      const stakingWeight = this.calculateStakingWeight(walletAddress);
      const totalWeight = Math.min(1.0, tokenWeight + stakingWeight);

      // Check combined requirements for skill publishing
      const hasMinTokens = await this.verifyStakingRequirements("10", walletAddress);
      const canSkillPublish = hasMinTokens.valid && totalWeight >= 0.5; // 50% weight requirement

      return {
        tokenBalance,
        stakingInfo,
        totalWeight,
        canSkillPublish
      };
    } catch (error) {
      return {
        tokenBalance: null,
        stakingInfo: null,
        totalWeight: 0,
        canSkillPublish: false
      };
    }
  }

  async executeStake(walletAddress: string, amount: string, signer: ethers.Signer): Promise<{ success: boolean; error?: string }> {
    try {
      const contract = new ethers.Contract(THINK_STAKING_ADDRESS, STAKING_ABI, signer);
      
      const stakeAmount = ethers.parseUnits(amount, 18);
      
      const tx = await contract.stake(stakeAmount);
      await tx.wait(); // Wait for confirmation
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async executeUnstake(walletAddress: string, amount: string, signer: ethers.Signer): Promise<{ success: boolean; error?: string }> {
    try {
      const contract = new ethers.Contract(THINK_STAKING_ADDRESS, STAKING_ABI, signer);
      
      const unstakeAmount = ethers.parseUnits(amount, 18);
      
      const tx = await contract.ununstake(unstakeAmount);
      await tx.wait(); // Wait for confirmation
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getStakingStats(): Promise<{
    totalStaked: string;
    totalStakers: number;
    currentEpoch: number;
    apr: number;
  }> {
    try {
      const contract = new ethers.Contract(THINK_STAKING_ADDRESS, STAKING_ABI, this.provider);
      
      const [totalStaked, currentEpoch] = await Promise.all([
        contract.getTotalStaked(),
        contract.currentEpoch()
      ]);

      // This would require additional contract methods for APR calculation
      const apr = 0; // Placeholder

      return {
        totalStaked: ethers.formatUnits(totalStaked, 18),
        totalStakers: 0, // Would need additional tracking
        currentEpoch: Number(currentEpoch),
        apr
      };
    } catch (error) {
      throw error;
    }
  }

  clearCache(): void {
    this.cacheMap.clear();
    try {
      fs.unlink(this.cachePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}