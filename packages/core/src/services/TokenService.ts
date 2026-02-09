import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { ethers } from 'ethers';
import { TokenBalance, TokenType, TokenHolding } from '@think/types';

const THINK_TOKEN_ADDRESS = '0xF9ff95468cb9A0cD57b8542bbc4c148e290Ff465';
const ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

interface CacheEntry {
  balance: string;
  decimals: number;
  symbol: string;
  timestamp: number;
  signature?: string;
}

export class TokenService {
  private provider: ethers.Provider;
  private cachePath: string;
  private cacheMap: Map<string, CacheEntry> = new Map();
  private signingKey: string | null = null;

  constructor(rpcUrl: string, userDataPath: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.cachePath = path.join(userDataPath, '.token_cache.json');
    this.ensureSigningKey();
    this.loadCache();
    
    console.log(`🪙 TokenService initialized:`);
    console.log(`   THINK Token: ${THINK_TOKEN_ADDRESS}`);
    console.log(`   Cache Path: ${this.cachePath}`);
  }

  private async ensureSigningKey() {
    try {
      const secretPath = path.join(path.dirname(this.cachePath), '.token_secret');
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
      console.error('Failed to initialize Token signing key. Caching disabled.', error);
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
    const payload = `${entry.balance}:${entry.decimals}:${entry.symbol}:${entry.timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(entry.signature));
  }

  private signCacheEntry(balance: string, decimals: number, symbol: string): string {
    if (!this.signingKey) throw new Error("Signing Key Missing");
    const timestamp = Date.now();
    const payload = `${balance}:${decimals}:${symbol}:${timestamp}`;
    return crypto.createHmac('sha256', this.signingKey).update(payload).digest('hex');
  }

  private async saveCache() {
    if (!this.signingKey) return;
    const obj: Record<string, any> = {};
    for (const [walletAddress, entry] of this.cacheMap.entries()) {
      entry.signature = this.signCacheEntry(entry.balance, entry.decimals, entry.symbol);
      entry.timestamp = Date.now();
      obj[walletAddress] = entry;
    }
    await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  async getTokenBalance(walletAddress: string): Promise<TokenBalance | null> {
    try {
      const contract = new ethers.Contract(THINK_TOKEN_ADDRESS, ABI, this.provider);
      
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

  async getTokenHoldings(walletAddress: string, otherTokens?: string[]): Promise<TokenHolding | null> {
    try {
      const thinkBalance = await this.getTokenBalance(walletAddress);
      if (!thinkBalance) return null;

      const holdings: TokenBalance[] = [thinkBalance];
      
      if (otherTokens && otherTokens.length > 0) {
        for (const tokenAddress of otherTokens) {
          try {
            const tokenContract = new ethers.Contract(tokenAddress, ABI, this.provider);
            const balance = await tokenContract.balanceOf(walletAddress);
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();
            const formattedBalance = ethers.formatUnits(balance, decimals);
            
            holdings.push({
              tokenAddress,
              tokenType: 'ERC20' as TokenType,
              balance: formattedBalance,
              decimals: Number(decimals),
              symbol: symbol as string
            });
          } catch (tokenError) {
            console.warn(`Failed to get balance for token ${tokenAddress}:`, tokenError);
          }
        }
      }

      return {
        address: walletAddress,
        holdings,
        totalUsdValue: undefined // Could be calculated with price oracle
      };
    } catch (error) {
      console.error(`Token holdings check failed for ${walletAddress}:`, error);
      return null;
    }
  }

  async getRichList(wallets: string[]): Promise<TokenHolding[]> {
      const holdings: TokenHolding[] = [];
      
      for (const walletAddress of wallets) {
        const holding = await this.getTokenHoldings(walletAddress);
        if (holding) {
          holdings.push(holding);
        }
      }
      
      return holdings;
  }

  async verifyMinThinkTokens(minAmount: string, walletAddress: string): Promise<boolean> {
    try {
      const holding = await this.getTokenHoldings(walletAddress);
      if (!holding) return false;

      const thinkBalance = holding.holdings.find((h: any) => h.tokenAddress === THINK_TOKEN_ADDRESS);
      if (!thinkBalance) return false;

      const amount = ethers.parseUnits(minAmount, thinkBalance.decimals || 18);
      return BigInt(thinkBalance.balance) >= amount;
    } catch (error) {
      console.error(`THINK token verification failed:`, error);
      return false;
    }
  }

  calculateTrustScore(walletAddress: string): number {
    const cacheEntry = this.cacheMap.get(walletAddress);
    if (!cacheEntry) return 0;

    try {
      const balance = ethers.parseUnits(cacheEntry.balance, cacheEntry.decimals || 18);
      const bigBalance = BigInt(balance);
      
      // Trust scoring based on THINK token holdings
      if (bigBalance >= BigInt(ethers.parseUnits('10000', 18))) {
        return 1.0; // Maximum trust for whale holders
      } else if (bigBalance >= BigInt(ethers.parseUnits('1000', 18))) {
        return 0.8; // High trust for large holders
      } else if (bigBalance >= BigInt(ethers.parseUnits('100', 18))) {
        return 0.6; // Medium trust for medium holders
      } else if (bigBalance >= BigInt(ethers.parseUnits('10', 18))) {
        return 0.4; // Low trust for small holders
      } else if (bigBalance > BigInt(0)) {
        return 0.2; // Minimal trust for dust holders
      } else {
        return 0.0; // No trust for non-holders
      }
    } catch {
      return 0.0;
    }
  }

  async getTokenInfo(): Promise<{ name: string; symbol: string; decimals: number; totalSupply: string }> {
    try {
      const contract = new ethers.Contract(THINK_TOKEN_ADDRESS, [
        ...ABI,
        'function totalSupply() view returns (uint256)'
      ], this.provider);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
        totalSupply: formattedTotalSupply
      };
    } catch (error) {
      console.error('Failed to get THINK token info:', error);
      throw error;
    }
  }

  async validateTokenTransfer(from: string, to: string, amount: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const holding = await this.getTokenHoldings(from);
      if (!holding) {
        return { valid: false, error: "Sender has no THINK tokens" };
      }

      const thinkBalance = holding.holdings.find((h: any) => h.tokenAddress === THINK_TOKEN_ADDRESS);
      if (!thinkBalance) {
        return { valid: false, error: "Sender has no THINK tokens" };
      }

      const transferAmount = ethers.parseUnits(amount, thinkBalance.decimals || 18);
      const availableBalance = ethers.parseUnits(thinkBalance.balance, thinkBalance.decimals || 18);

      if (BigInt(transferAmount) > BigInt(availableBalance)) {
        return { valid: false, error: "Insufficient THINK token balance" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}