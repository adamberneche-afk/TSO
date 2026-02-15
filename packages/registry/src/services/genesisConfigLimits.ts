// packages/registry/src/services/genesisConfigLimits.ts
// Genesis holder configuration limits and persistence

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';

// Multiple RPC providers for redundancy
const RPC_PROVIDERS = [
  process.env.RPC_URL,
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com'
].filter(Boolean) as string[];

// Cache expiration time (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

// ERC721 ABI for balanceOf and tokenOfOwnerByIndex
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

// Simple in-memory cache
const nftCache = new Map<string, { result: NFTOwnershipResult; timestamp: number }>();

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
  description?: string
) {
  // Check limits first
  const check = await canCreateConfiguration(walletAddress);
  
  if (!check.allowed) {
    throw new Error(check.error || 'Configuration limit reached');
  }
  
  // Get ownership info
  const ownership = await verifyNFTOwnership(walletAddress);
  
  if (!ownership.isHolder || ownership.tokenIds.length === 0) {
    throw new Error('No NFTs found for this wallet');
  }
  
  // Use the first token ID for association
  const primaryTokenId = ownership.tokenIds[0];
  
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
      isActive: true
    }
  });
  
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
  
  // Update
  const config = await prisma.agentConfiguration.update({
    where: { id: configId },
    data: {
      ...updates,
      version: { increment: 1 },
      updatedAt: new Date()
    }
  });
  
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
 * Cache NFT verification result
 */
async function cacheNFTResult(walletAddress: string, result: NFTOwnershipResult): Promise<void> {
  const cacheKey = walletAddress.toLowerCase();
  nftCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  console.log(`[NFT Cache] Cached result for ${walletAddress}`);
}

/**
 * Get cached NFT status if not expired
 */
async function getCachedNFTStatus(walletAddress: string): Promise<NFTOwnershipResult | null> {
  const cacheKey = walletAddress.toLowerCase();
  const cached = nftCache.get(cacheKey);
  
  if (!cached) return null;
  
  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    console.log(`[NFT Cache] Cache expired for ${walletAddress}`);
    nftCache.delete(cacheKey);
    return null;
  }
  
  console.log(`[NFT Cache] Using cached result for ${walletAddress}`);
  return cached.result;
}

/**
 * Clear NFT cache for a wallet
 */
export function clearNFTCache(walletAddress: string): void {
  const cacheKey = walletAddress.toLowerCase();
  nftCache.delete(cacheKey);
  console.log(`[NFT Cache] Cleared cache for ${walletAddress}`);
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
