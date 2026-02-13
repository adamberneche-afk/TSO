// packages/registry/src/services/genesisConfigLimits.ts
// Genesis holder configuration limits and persistence

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GENESIS_CONTRACT = '0x11B3EfbF04F0bA505F380aC20444B6952970AdA6';
const RPC_URL = process.env.RPC_URL || 'https://cloudflare-eth.com';

// ERC721 ABI for balanceOf and tokenOfOwnerByIndex
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

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
 */
export async function verifyNFTOwnership(walletAddress: string): Promise<NFTOwnershipResult> {
  console.log(`[NFT Verify] Checking ownership for ${walletAddress}`);
  console.log(`[NFT Verify] Using RPC: ${RPC_URL}`);
  console.log(`[NFT Verify] Contract: ${GENESIS_CONTRACT}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(GENESIS_CONTRACT, ERC721_ABI, provider);
    
    // Get balance
    console.log(`[NFT Verify] Calling balanceOf...`);
    const balance = await contract.balanceOf(walletAddress);
    const tokenCount = Number(balance);
    console.log(`[NFT Verify] Balance: ${tokenCount}`);
    
    if (tokenCount === 0) {
      return {
        isHolder: false,
        tokenCount: 0,
        tokenIds: []
      };
    }
    
    // Get all token IDs
    const tokenIds: string[] = [];
    for (let i = 0; i < tokenCount; i++) {
      try {
        const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
        tokenIds.push(tokenId.toString());
      } catch (err) {
        console.warn(`Failed to get token at index ${i}:`, err);
      }
    }
    
    return {
      isHolder: true,
      tokenCount,
      tokenIds
    };
    
  } catch (error) {
    console.error('NFT verification error:', error);
    return {
      isHolder: false,
      tokenCount: 0,
      tokenIds: [],
      error: error instanceof Error ? error.message : 'Unknown error'
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
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(GENESIS_CONTRACT, ERC721_ABI, provider);
    
    const owner = await contract.ownerOf(tokenId);
    return owner.toLowerCase() === walletAddress.toLowerCase();
    
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
