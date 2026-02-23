// packages/registry/src/services/genesisConfigLimits.ts
// Genesis holder configuration limits and persistence

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { cacheGet, cacheSet, cacheDelete, isRedisAvailable } from './redis';
import { createVersionSnapshot } from './configurationVersioning';

const prisma = new PrismaClient();

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

// Multiple RPC providers for redundancy
const RPC_PROVIDERS = [
  process.env.RPC_URL,
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com'
].filter(Boolean) as string[];

// Cache expiration time (15 minutes - reduced from 1 hour for memory efficiency)
const CACHE_TTL_MS = 15 * 60 * 1000;

// Maximum cache entries (prevent unbounded memory growth)
const MAX_CACHE_SIZE = 500;

// ERC721 ABI for balanceOf and tokenOfOwnerByIndex
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

interface CacheEntry {
  result: NFTOwnershipResult;
  timestamp: number;
  lastAccessed: number;
}

/**
 * LRU Cache with TTL and size limits
 */
class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = MAX_CACHE_SIZE, ttl: number = CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): NFTOwnershipResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed for LRU
    entry.lastAccessed = Date.now();
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.result;
  }

  set(key: string, value: NFTOwnershipResult): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`[LRU Cache] Evicted oldest entry: ${oldestKey}`);
      }
    }

    this.cache.set(key, {
      result: value,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  // Get memory usage estimate (bytes)
  getMemoryUsage(): number {
    return JSON.stringify([...this.cache.entries()]).length;
  }
}

// Replace simple Map with LRU cache
const nftCache = new LRUCache(MAX_CACHE_SIZE, CACHE_TTL_MS);

interface NFTOwnershipResult {
  isHolder: boolean;
  tokenCount: number;
  tokenIds: string[];
  error?: string;
}

interface ConfigCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  tokenCount: number;
  error?: string;
}

/**
 * Verify NFT ownership for a wallet address
 * Returns all token IDs owned by the wallet
 * Uses multiple RPC providers with fallback
 */
export async function verifyNFTOwnership(walletAddress: string): Promise<NFTOwnershipResult> {
  console.log(`[NFT Verify] Checking ownership for ${walletAddress}`);
  console.log(`[NFT Verify] Contract: ${GENESIS_CONTRACT}`);
  
  // Check cache first
  const cached = await getCachedNFTStatus(walletAddress);
  if (cached) {
    console.log(`[NFT Verify] Using cached result: ${cached.tokenCount} NFTs`);
    return cached;
  }
  
  // Try multiple RPC providers
  try {
    return await verifyWithFallbackRPC(walletAddress);
  } catch (error) {
    console.error('[NFT Verify] All RPC providers failed:', error);
    
    return {
      isHolder: false,
      tokenCount: 0,
      tokenIds: [],
      error: 'Unable to verify NFT ownership. Please try again later.'
    };
  }
}

/**
 * Check if a specific wallet owns a specific token
 */
export async function verifyTokenOwnership(
  walletAddress: string, 
  tokenId: string
): Promise<boolean> {
  try {
    // Try each RPC provider
    for (const rpcUrl of RPC_PROVIDERS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(GENESIS_CONTRACT, ERC721_ABI, provider);
        
        const owner = await contract.ownerOf(tokenId);
        return owner.toLowerCase() === walletAddress.toLowerCase();
      } catch (err) {
        console.warn(`[NFT Verify] RPC ${rpcUrl} failed for token check, trying next...`);
        continue;
      }
    }
    return false;
  } catch (error) {
    console.error('Token ownership verification error:', error);
    return false;
  }
}

/**
 * Calculate configuration limits for a wallet
 * 2 configurations per token held
 */
export function calculateConfigLimit(tokenCount: number): number {
  return tokenCount * 2;
}

/**
 * Check if wallet can create more configurations
 */
export async function canCreateConfiguration(walletAddress: string): Promise<ConfigCheckResult> {
  // Verify NFT ownership
  const ownership = await verifyNFTOwnership(walletAddress);
  
  if (!ownership.isHolder) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      tokenCount: 0,
      error: 'Wallet does not hold any THINK Agent Bundle NFTs'
    };
  }
  
  if (ownership.error) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      tokenCount: 0,
      error: ownership.error
    };
  }
  
  // Get current configuration count
  const currentCount = await prisma.agentConfiguration.count({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      isActive: true
    }
  });
  
  const limit = calculateConfigLimit(ownership.tokenCount);
  const remaining = limit - currentCount;
  
  return {
    allowed: remaining > 0,
    currentCount,
    limit,
    remaining,
    tokenCount: ownership.tokenCount,
    error: remaining <= 0 ? `Configuration limit reached. You can save up to ${limit} configurations (${ownership.tokenCount} NFTs × 2).` : undefined
  };
}

/**
 * Get all configurations for a wallet
 */
export async function getWalletConfigurations(walletAddress: string) {
  return await prisma.agentConfiguration.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      isActive: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
}

/**
 * Save a new configuration
 */
export async function saveConfiguration(
  walletAddress: string,
  name: string,
  configData: any,
  description?: string,
  personalityMd?: string
) {
  // Check limits first
  const check = await canCreateConfiguration(walletAddress);
  
  if (!check.allowed) {
    throw new Error(check.error || 'Configuration limit reached');
  }
  
  // Get ownership info - always verify fresh to ensure isHolder is accurate
  // The cache might have stale data with isHolder=false even when user has NFTs
  let ownership = await verifyNFTOwnership(walletAddress);
  
  if (!ownership || !ownership.isHolder) {
    throw new Error('No NFTs found for this wallet');
  }
  
  // Use first token ID or a placeholder if tokenIds array is empty
  const primaryTokenId = ownership.tokenIds.length > 0 ? ownership.tokenIds[0] : 'genesis-nft';
  
  // Create configuration
  const config = await prisma.agentConfiguration.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      nftTokenId: primaryTokenId,
      nftContractAddress: GENESIS_CONTRACT,
      verifiedAt: new Date(),
      name,
      description,
      configData,
      personalityMd: personalityMd || null,
      personalityVersion: personalityMd ? 1 : 1,
      isActive: true
    }
  });
  
  await createVersionSnapshot(
    config.id,
    walletAddress,
    configData,
    personalityMd,
    'Initial version'
  );
  
  return {
    config,
    remaining: check.remaining - 1,
    limit: check.limit
  };
}

/**
 * Update an existing configuration
 */
export async function updateConfiguration(
  configId: string,
  walletAddress: string,
  updates: {
    name?: string;
    description?: string;
    configData?: any;
    personalityMd?: string | null;
  }
) {
  // Verify ownership
  const existing = await prisma.agentConfiguration.findFirst({
    where: {
      id: configId,
      walletAddress: walletAddress.toLowerCase(),
      isActive: true
    }
  });
  
  if (!existing) {
    throw new Error('Configuration not found or access denied');
  }
  
  // Check if personality changed and increment version if so
  const personalityChanged = updates.personalityMd !== undefined && 
    updates.personalityMd !== existing.personalityMd;
  
  // Update
  const config = await prisma.agentConfiguration.update({
    where: { id: configId },
    data: {
      ...updates,
      personalityVersion: personalityChanged 
        ? { increment: 1 } 
        : existing.personalityVersion,
      version: { increment: 1 },
      updatedAt: new Date()
    }
  });
  
  await createVersionSnapshot(
    configId,
    walletAddress,
    updates.configData || existing.configData,
    updates.personalityMd ?? undefined,
    updates.description || 'Updated'
  );
  
  return config;
}

/**
 * Soft delete a configuration
 */
export async function deleteConfiguration(
  configId: string,
  walletAddress: string
) {
  // Verify ownership
  const existing = await prisma.agentConfiguration.findFirst({
    where: {
      id: configId,
      walletAddress: walletAddress.toLowerCase(),
      isActive: true
    }
  });
  
  if (!existing) {
    throw new Error('Configuration not found or access denied');
  }
  
  // Soft delete
  await prisma.agentConfiguration.update({
    where: { id: configId },
    data: {
      isActive: false,
      updatedAt: new Date()
    }
  });
  
  return { success: true };
}

export { GENESIS_CONTRACT };
export type { NFTOwnershipResult, ConfigCheckResult };

/**
 * Get cache statistics for monitoring
 */
export function getNFTCacheStats(): { 
  size: number; 
  maxSize: number; 
  ttl: number; 
  memoryBytes: number;
  provider: 'redis' | 'memory';
} {
  const redisAvailable = isRedisAvailable();
  
  return {
    size: redisAvailable ? -1 : nftCache.size(), // -1 indicates Redis (can't easily get count)
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL_MS,
    memoryBytes: redisAvailable ? 0 : nftCache.getMemoryUsage(),
    provider: redisAvailable ? 'redis' : 'memory'
  };
}

/**
 * Cache NFT verification result (Redis with in-memory fallback)
 */
async function cacheNFTResult(walletAddress: string, result: NFTOwnershipResult): Promise<void> {
  const cacheKey = `nft:${walletAddress.toLowerCase()}`;
  
  const redisAvailable = isRedisAvailable();
  if (redisAvailable) {
    await cacheSet(cacheKey, JSON.stringify(result), 900);
    console.log(`[NFT Cache] Redis: Cached result for ${walletAddress}`);
  } else {
    nftCache.set(walletAddress.toLowerCase(), result);
    console.log(`[NFT Cache] Memory: Cached result for ${walletAddress}, cache size: ${nftCache.size()}`);
  }
}

/**
 * Get cached NFT status if not expired
 */
async function getCachedNFTStatus(walletAddress: string): Promise<NFTOwnershipResult | null> {
  const cacheKey = `nft:${walletAddress.toLowerCase()}`;
  
  const redisAvailable = isRedisAvailable();
  if (redisAvailable) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      console.log(`[NFT Cache] Redis: Using cached result for ${walletAddress}`);
      return JSON.parse(cached) as NFTOwnershipResult;
    }
    return null;
  }
  
  const cached = nftCache.get(walletAddress.toLowerCase());
  if (!cached) return null;
  
  console.log(`[NFT Cache] Memory: Using cached result for ${walletAddress}`);
  return cached;
}

/**
 * Clear NFT cache for a wallet
 */
export function clearNFTCache(walletAddress: string): void {
  const cacheKey = `nft:${walletAddress.toLowerCase()}`;
  
  const redisAvailable = isRedisAvailable();
  if (redisAvailable) {
    cacheDelete(cacheKey);
    console.log(`[NFT Cache] Redis: Cleared cache for ${walletAddress}`);
  } else {
    nftCache.delete(walletAddress.toLowerCase());
    console.log(`[NFT Cache] Memory: Cleared cache for ${walletAddress}`);
  }
}

/**
 * Verify NFT ownership with multiple RPC fallback
 */
async function verifyWithFallbackRPC(walletAddress: string): Promise<NFTOwnershipResult> {
  let lastError: Error | null = null;
  
  for (const rpcUrl of RPC_PROVIDERS) {
    try {
      console.log(`[NFT Verify] Trying RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test connection with a simple call
      await provider.getBlockNumber();
      
      const contract = new ethers.Contract(GENESIS_CONTRACT, ERC721_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      const tokenCount = Number(balance);
      
      console.log(`[NFT Verify] Success with ${rpcUrl}, balance: ${tokenCount}`);
      
      if (tokenCount === 0) {
        const result = { isHolder: false, tokenCount: 0, tokenIds: [] };
        await cacheNFTResult(walletAddress, result);
        return result;
      }
      
      // Get token IDs
      const tokenIds: string[] = [];
      for (let i = 0; i < tokenCount; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
          tokenIds.push(tokenId.toString());
        } catch (err) {
          console.warn(`[NFT Verify] Failed to get token at index ${i}:`, err);
        }
      }
      
      const result = { isHolder: true, tokenCount, tokenIds };
      await cacheNFTResult(walletAddress, result);
      return result;
      
    } catch (error) {
      console.error(`[NFT Verify] RPC ${rpcUrl} failed:`, error);
      lastError = error as Error;
      // Continue to next provider
    }
  }
  
  // All RPCs failed
  throw lastError || new Error('All RPC providers failed');
}
