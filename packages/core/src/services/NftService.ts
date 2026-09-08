import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs/promises';
import { accessSync, readFileSync, writeFileSync } from 'fs';
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
    this.provider = new ethers.JsonRpcProvider(rpcUrl, 1);
    this.cachePath = path.join(userDataPath, '.nft_cache.json');
    this.secretPath = path.join(userDataPath, SECRET_FILENAME);
    this.ensureSigningKey();
  }

  // Synchronous by design -- see the matching comment on ensureSigningKey
  // in TokenService/IsnadService/AuditRegistry/StakingService. Was
  // `async`, called fire-and-forget from the constructor, letting its
  // secret-file write still be in flight when a caller (or a test's
  // teardown) moved on.
  private ensureSigningKey() {
    try {
      try {
        accessSync(this.secretPath);
        const secretContent = readFileSync(this.secretPath, 'utf-8');
        this.signingKey = secretContent.trim();
      } catch (accessError) {
        const newSecret = crypto.randomBytes(32).toString('hex');
        writeFileSync(this.secretPath, newSecret, { mode: 0o600 });
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
