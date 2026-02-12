import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { ethers } from 'ethers';
import { SkillProvenanceSchema, IsnadLink } from '@think/types';
import { TokenService } from './TokenService';
import { StakingService } from './StakingService';

// Default to THINK Genesis Bundle for beta testing
// Future: Custom contracts deployed via $THINK staking
const DEFAULT_PUBLISHER_NFT = process.env.PUBLISHER_NFT_ADDRESS || 
                               process.env.GENESIS_CONTRACT || 
                               '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
const DEFAULT_AUDITOR_NFT = process.env.AUDITOR_NFT_ADDRESS || 
                             process.env.GENESIS_CONTRACT || 
                             '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
const ABI = ['function balanceOf(address owner) view returns (uint256)'];

interface CacheEntry {
  isnadChain: IsnadLink[];
  trustScore: number;
  timestamp: number;
  signature?: string;
}

export class IsnadService {
  private provider: ethers.Provider;
  private cachePath: string;
  private cacheMap: Map<string, CacheEntry> = new Map();
  private signingKey: string | null = null;
  private tokenService: TokenService;
  private stakingService: StakingService;
  private publisherNftAddress: string;
  private auditorNftAddress: string;

  constructor(rpcUrl: string, userDataPath: string, publisherNftAddress?: string, auditorNftAddress?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.cachePath = path.join(userDataPath, '.isnad_cache.json');
    this.tokenService = new TokenService(rpcUrl, userDataPath);
    this.stakingService = new StakingService(rpcUrl, userDataPath);
    
    // Use provided addresses, env vars, or defaults (Genesis Bundle for beta)
    this.publisherNftAddress = publisherNftAddress || DEFAULT_PUBLISHER_NFT;
    this.auditorNftAddress = auditorNftAddress || DEFAULT_AUDITOR_NFT;
    
    this.ensureSigningKey();
    this.loadCache();
    
    console.log(`🔐 IsnadService initialized:`);
    console.log(`   Publisher NFT: ${this.publisherNftAddress}`);
    console.log(`   Auditor NFT: ${this.auditorNftAddress}`);
    console.log(`   THINK Token: 0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465`);
    console.log(`   Staking Contract: 0x08071901A5C4D2950888Ce2b299bBd0e3087d101`);
    console.log(`   Cache Path: ${this.cachePath}`);
    console.log(`   Mode: ${process.env.PUBLISHER_NFT_ADDRESS ? 'Custom Contracts' : 'Genesis Bundle (Beta)'}`);
  }

  private async ensureSigningKey() {
    try {
      const secretPath = path.join(path.dirname(this.cachePath), '.isnad_secret');
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
      console.error('Failed to initialize Isnad signing key. Caching disabled.', error);
      this.signingKey = null;
    }
  }

  private async loadCache() {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const parsed = JSON.parse(data);
      const validMap = new Map<string, CacheEntry>();
      for (const [skillHash, entry] of Object.entries(parsed)) {
        if (this.verifyCacheEntry(skillHash, entry as CacheEntry)) {
          validMap.set(skillHash, entry as CacheEntry);
        }
      }
      this.cacheMap = validMap;
    } catch {
    }
  }

  private verifyCacheEntry(skillHash: string, entry: CacheEntry): boolean {
    if (!this.signingKey || !entry.signature) return false;
    const payload = `${JSON.stringify(entry.isnadChain)}:${entry.trustScore}:${entry.timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(entry.signature));
  }

  private signCacheEntry(isnadChain: IsnadLink[], trustScore: number): string {
    if (!this.signingKey) throw new Error("Signing Key Missing");
    const timestamp = Date.now();
    const payload = `${JSON.stringify(isnadChain)}:${trustScore}:${timestamp}`;
    return crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
  }

  private async saveCache() {
    if (!this.signingKey) return;
    const obj: Record<string, any> = {};
    for (const [skillHash, entry] of this.cacheMap.entries()) {
      entry.signature = this.signCacheEntry(entry.isnadChain, entry.trustScore);
      entry.timestamp = Date.now();
      obj[skillHash] = entry;
    }
    await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  private async verifyPublisherNft(walletAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(this.publisherNftAddress, ABI, this.provider);
      const balance: bigint = await contract.balanceOf(walletAddress);
      return balance > 0n;
    } catch {
      return false;
    }
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

  async addLink(skillHash: string, link: IsnadLink): Promise<{ success: boolean; error?: string }> {
    try {
      if (link.role === 'author') {
        const hasPublisherNft = await this.verifyPublisherNft(link.wallet);
        if (!hasPublisherNft) {
          return { success: false, error: "Author must hold Publisher NFT" };
        }
      }

      if (link.role === 'auditor') {
        const hasAuditorNft = await this.verifyAuditorNft(link.wallet);
        if (!hasAuditorNft) {
          return { success: false, error: "Auditor must hold Auditor NFT" };
        }
      }

      const signaturePayload = `${skillHash}:${link.wallet}:${link.role}:${link.timestamp}`;
      const expectedSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

      if (link.signature !== expectedSignature) {
        return { success: false, error: "Invalid signature" };
      }

      const entry = this.cacheMap.get(skillHash) || { isnadChain: [], trustScore: 0, timestamp: Date.now() };
      entry.isnadChain.push(link);
      entry.trustScore = await this.calculateTrustScore(entry.isnadChain, link.wallet);
      this.cacheMap.set(skillHash, entry);
      await this.saveCache();

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  getChain(skillHash: string): IsnadLink[] {
    const entry = this.cacheMap.get(skillHash);
    return entry?.isnadChain || [];
  }

  async calculateTrustScore(chain: IsnadLink[], walletAddress?: string): Promise<number> {
    let score = 0;
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Base score from isnad chain
    for (const link of chain) {
      const linkAge = now - new Date(link.timestamp).getTime();
      const freshness = Math.max(0, 1 - (linkAge / (30 * DAY_MS)));

      switch (link.role) {
        case 'author':
          score += 30 * freshness;
          break;
        case 'auditor':
          score += 20 * freshness;
          break;
        case 'voucher':
          score += 10 * freshness;
          break;
      }
    }

    // Additional score from THINK token holdings
    if (walletAddress) {
      try {
        const stakingWeight = this.stakingService.calculateStakingWeight(walletAddress);
        score += Math.min(30, stakingWeight * 30); // Up to 30 points for staking
      } catch (error) {
        console.warn('Failed to get THINK staking weight for trust scoring:', error);
      }
    }

    return Math.min(1.0, score / 120); // Max score: 100 (60 from isnad + 30 from tokens + 30 from staking)
  }

  async verifyProvenance(provenance: any, walletAddress?: string): Promise<boolean> {
    try {
      const validated = SkillProvenanceSchema.parse(provenance);

      for (const link of validated.auditors) {
        const signaturePayload = `${link.role}:${link.wallet}:${link.timestamp}`;
        const expectedSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

        if (link.signature !== expectedSignature) {
          return false;
        }
      }

      const calculatedScore = await this.calculateTrustScore(validated.auditors, walletAddress);
      return Math.abs(calculatedScore - validated.trust_score) < 0.01;
    } catch {
      return false;
    }
  }
}
