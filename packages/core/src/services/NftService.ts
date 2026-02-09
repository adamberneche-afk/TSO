import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const GENESIS_NFT_ADDRESS = '0x1234567890123456789012345678901234567890';
const ABI = ['function balanceOf(address owner) view returns (uint256)'];
const TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  isValid: boolean;
  timestamp: number;
  signature?: string;
}

const SECRET_FILENAME = '.tais_secret';

export class NftService {
  private provider: ethers.Provider;
  private cachePath: string;
  private secretPath: string;
  private cacheMap: Map<string, CacheEntry> = new Map();
  private signingKey: string | null = null;

  constructor(rpcUrl: string, userDataPath: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.cachePath = path.join(userDataPath, '.nft_cache.json');
    this.secretPath = path.join(userDataPath, SECRET_FILENAME);
    this.ensureSigningKey();
  }

  private async ensureSigningKey() {
    try {
      try {
        await fs.access(this.secretPath);
        const secretContent = await fs.readFile(this.secretPath, 'utf-8');
        this.signingKey = secretContent.trim();
      } catch (accessError) {
        const newSecret = crypto.randomBytes(32).toString('hex');
        await fs.writeFile(this.secretPath, newSecret, { mode: 0o600 });
        this.signingKey = newSecret;
      }
    } catch (error) {
      console.error('Failed to initialize signing key. Caching disabled.', error);
      this.signingKey = null;
    }
  }

  private verifyEntry(wallet: string, entry: any): boolean {
    if (!this.signingKey || !entry.signature) return false;
    const payload = `${entry.isValid}:${entry.timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(entry.signature));
  }

  private signEntry(isValid: boolean, timestamp: number): string {
    if (!this.signingKey) throw new Error("Signing Key Missing");
    const payload = `${isValid}:${timestamp}`;
    return crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
  }

  async verifyOwnership(walletAddress: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.cacheMap.get(walletAddress);
    if (cached && (now - cached.timestamp < TTL_MS)) {
      return cached.isValid;
    }

    try {
      const contract = new ethers.Contract(GENESIS_NFT_ADDRESS, ABI, this.provider);
      const balance: bigint = await contract.balanceOf(walletAddress);
      const hasNft = balance > 0n;

      const timestamp = now;
      const signature = this.signEntry(hasNft, timestamp);
      this.cacheMap.set(walletAddress, { isValid: hasNft, timestamp, signature });
      await this.saveCache();

      return hasNft;
    } catch (error) {
      console.error('[NftService] Verification failed:', error);
      return false;
    }
  }

  private async saveCache() {
    if (!this.signingKey) return;
    const obj = Object.fromEntries(this.cacheMap);
    await fs.writeFile(this.cachePath, JSON.stringify(obj), 'utf-8');
  }
}
