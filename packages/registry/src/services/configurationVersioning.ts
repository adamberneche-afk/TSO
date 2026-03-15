import { PrismaClient } from '@prisma/client';
import { createSkillsPrismaClient } from '../config/database';
import { canCreateConfiguration } from './genesisConfigLimits';

const prisma = createSkillsPrismaClient();

const TIER_LIMITS = {
  bronze: { days: 7, maxVersions: 10 },
  silver: { days: 30, maxVersions: 30 },
  gold: { days: 90, maxVersions: 100 }
};

export type TierType = 'bronze' | 'silver' | 'gold';

export async function getUserTier(walletAddress: string): Promise<TierType> {
  const status = await canCreateConfiguration(walletAddress);
  
  if (!status.allowed) return 'bronze';
  
  if (status.limit >= 50) return 'gold';
  if (status.limit >= 20) return 'silver';
  return 'bronze';
}

export async function createVersionSnapshot(
  configId: string,
  walletAddress: string,
  configData: any,
  personalityMd?: string,
  versionNote?: string
): Promise<void> {
  const tier = await getUserTier(walletAddress);
  const limits = TIER_LIMITS[tier];
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + limits.days);
  
  const latestVersion = await prisma.configurationVersion.findFirst({
    where: { configId },
    orderBy: { version: 'desc' }
  });
  
  const newVersion = (latestVersion?.version || 0) + 1;
  
  await prisma.configurationVersion.create({
    data: {
      configId,
      walletAddress: walletAddress.toLowerCase(),
      version: newVersion,
      versionNote,
      configSnapshot: configData,
      personalityMd: personalityMd || null,
      tier,
      expiresAt
    }
  });
  
  await pruneOldVersions(configId, tier);
}

async function pruneOldVersions(configId: string, tier: TierType): Promise<void> {
  const limits = TIER_LIMITS[tier];
  
  const versions = await prisma.configurationVersion.findMany({
    where: { configId },
    orderBy: { version: 'desc' },
    take: limits.maxVersions + 1
  });
  
  if (versions.length > limits.maxVersions) {
    const toDelete = versions.slice(limits.maxVersions);
    const idsToDelete = toDelete.map((v: any) => v.id);
    
    await prisma.configurationVersion.deleteMany({
      where: { id: { in: idsToDelete } }
    });
  }
  
  await prisma.configurationVersion.deleteMany({
    where: {
      configId,
      expiresAt: { lt: new Date() }
    }
  });
}

export async function getConfigVersions(configId: string, walletAddress: string): Promise<any[]> {
  const versions = await prisma.configurationVersion.findMany({
    where: { configId, walletAddress: walletAddress.toLowerCase() },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      versionNote: true,
      tier: true,
      createdAt: true,
      expiresAt: true
    }
  });
  
  return versions;
}

export async function getVersionDetails(configId: string, walletAddress: string, version: number): Promise<any> {
  const versionData = await prisma.configurationVersion.findFirst({
    where: { 
      configId, 
      walletAddress: walletAddress.toLowerCase(),
      version 
    }
  });
  
  if (!versionData) {
    throw new Error('Version not found');
  }
  
  return versionData;
}

export async function rollbackToVersion(
  configId: string,
  walletAddress: string,
  version: number
): Promise<any> {
  const versionData = await prisma.configurationVersion.findFirst({
    where: { 
      configId, 
      walletAddress: walletAddress.toLowerCase(),
      version 
    }
  });
  
  if (!versionData) {
    throw new Error('Version not found');
  }
  
  const updated = await prisma.agentConfiguration.update({
    where: { id: configId },
    data: {
      configData: versionData.configSnapshot as any,
      personalityMd: versionData.personalityMd,
      version: { increment: 1 }
    }
  });
  
  await createVersionSnapshot(
    configId,
    walletAddress,
    versionData.configSnapshot,
    versionData.personalityMd || undefined,
    `Rollback to v${version}`
  );
  
  return updated;
}

export async function pruneExpiredVersions(): Promise<number> {
  const result = await prisma.configurationVersion.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  
  return result.count;
}

export default {
  createVersionSnapshot,
  getConfigVersions,
  getVersionDetails,
  rollbackToVersion,
  pruneExpiredVersions,
  getUserTier
};
