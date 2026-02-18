/**
 * RAG Tier Quotas and Access Control
 * Enforces tier-based limits for Platform RAG
 * Based on staking tier document specifications
 */

// Tier quotas (from staking document)
export const RAG_TIER_QUOTAS = {
  free: {
    platformStorage: 0,              // Local only, no cloud storage
    embeddingsPerMonth: 0,           // No embeddings
    appConnections: 0,               // No app integrations
    queryRateLimit: 0,               // No queries (local only)
    syncDevices: 0,                  // Local only
    versionHistory: 0,               // No version history
  },
  bronze: {
    platformStorage: 1_000_000_000,       // 1 GB
    embeddingsPerMonth: 100_000,          // 100K chunks/month
    appConnections: 3,                    // 3 apps
    queryRateLimit: 1_000,                // 1K queries/day
    syncDevices: 3,                       // 3 devices
    versionHistory: 30,                   // 30 days
  },
  silver: {
    platformStorage: 10_000_000_000,      // 10 GB
    embeddingsPerMonth: 500_000,          // 500K chunks/month
    appConnections: 10,                   // 10 apps
    queryRateLimit: 10_000,               // 10K queries/day
    syncDevices: 10,                      // 10 devices
    versionHistory: 90,                   // 90 days
  },
  gold: {
    platformStorage: 100_000_000_000,     // 100 GB
    embeddingsPerMonth: 2_000_000,        // 2M chunks/month
    appConnections: Number.MAX_SAFE_INTEGER, // Unlimited
    queryRateLimit: 100_000,              // 100K queries/day
    syncDevices: Number.MAX_SAFE_INTEGER, // Unlimited
    versionHistory: 365,                  // 1 year
  }
};

export type RAGTier = 'free' | 'bronze' | 'silver' | 'gold';

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  quota?: number;
}

export class RAGAccessControl {
  private prisma: any;
  private logger: any;

  constructor(prisma: any, logger: any) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Get user's tier from staking contract or database
   */
  async getUserTier(walletAddress: string): Promise<RAGTier> {
    // TODO: In production, query staking contract
    // For now, query database or default to free
    try {
      // Check if user has any documents (indicates bronze+)
      const docCount = await this.prisma.rAGDocument.count({
        where: { walletAddress: walletAddress.toLowerCase() }
      });
      
      if (docCount > 0) {
        // Check usage to determine tier
        const usage = await this.prisma.rAGUserUsage.findUnique({
          where: { walletAddress: walletAddress.toLowerCase() }
        });
        
        if (usage) {
          if (usage.storageUsed >= RAG_TIER_QUOTAS.silver.platformStorage) {
            return 'gold';
          } else if (usage.storageUsed >= RAG_TIER_QUOTAS.bronze.platformStorage) {
            return 'silver';
          }
        }
        return 'bronze';
      }
      
      return 'free';
    } catch (error) {
      this.logger.error('Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Check if user can store additional data
   */
  async canStore(walletAddress: string, additionalBytes: number): Promise<QuotaCheck> {
    const tier = await this.getUserTier(walletAddress);
    
    if (tier === 'free') {
      return {
        allowed: false,
        reason: 'Free tier does not include cloud storage. Upgrade to Bronze to store data in Platform RAG.',
        currentUsage: 0,
        quota: 0
      };
    }

    const quota = RAG_TIER_QUOTAS[tier].platformStorage;
    
    try {
      const usage = await this.getOrCreateUsage(walletAddress);
      const newUsage = usage.storageUsed + additionalBytes;
      
      if (newUsage > quota) {
        return {
          allowed: false,
          reason: `Storage quota exceeded. ${tier} tier: ${this.formatBytes(quota)}. You're using ${this.formatBytes(usage.storageUsed)}.`,
          currentUsage: usage.storageUsed,
          quota: quota
        };
      }
      
      return {
        allowed: true,
        currentUsage: usage.storageUsed,
        quota: quota
      };
    } catch (error) {
      this.logger.error('Error checking storage quota:', error);
      return { allowed: false, reason: 'Error checking quota' };
    }
  }

  /**
   * Check if user can generate embeddings
   */
  async canEmbed(walletAddress: string, count: number): Promise<QuotaCheck> {
    const tier = await this.getUserTier(walletAddress);
    
    if (tier === 'free') {
      return {
        allowed: false,
        reason: 'Free tier does not include embeddings. Upgrade to Bronze.',
        currentUsage: 0,
        quota: 0
      };
    }

    // Reset monthly usage if needed
    await this.resetMonthlyUsageIfNeeded(walletAddress);
    
    const quota = RAG_TIER_QUOTAS[tier].embeddingsPerMonth;
    
    try {
      const usage = await this.getOrCreateUsage(walletAddress);
      const newUsage = usage.embeddingsThisMonth + count;
      
      if (newUsage > quota) {
        return {
          allowed: false,
          reason: `Monthly embedding quota exceeded. ${tier} tier: ${quota.toLocaleString()} embeddings/month. You've used ${usage.embeddingsThisMonth.toLocaleString()}.`,
          currentUsage: usage.embeddingsThisMonth,
          quota: quota
        };
      }
      
      return {
        allowed: true,
        currentUsage: usage.embeddingsThisMonth,
        quota: quota
      };
    } catch (error) {
      this.logger.error('Error checking embedding quota:', error);
      return { allowed: false, reason: 'Error checking quota' };
    }
  }

  /**
   * Check if user can connect more apps
   */
  async canConnectApp(walletAddress: string): Promise<QuotaCheck> {
    const tier = await this.getUserTier(walletAddress);
    
    if (tier === 'free') {
      return {
        allowed: false,
        reason: 'Free tier does not include app integrations. Upgrade to Bronze.',
        currentUsage: 0,
        quota: 0
      };
    }

    const quota = RAG_TIER_QUOTAS[tier].appConnections;
    
    try {
      const usage = await this.getOrCreateUsage(walletAddress);
      
      if (usage.appConnectionsUsed >= quota) {
        return {
          allowed: false,
          reason: `App connection limit reached. ${tier} tier: ${quota} apps. Disconnect an app to add a new one.`,
          currentUsage: usage.appConnectionsUsed,
          quota: quota
        };
      }
      
      return {
        allowed: true,
        currentUsage: usage.appConnectionsUsed,
        quota: quota
      };
    } catch (error) {
      this.logger.error('Error checking app quota:', error);
      return { allowed: false, reason: 'Error checking quota' };
    }
  }

  /**
   * Check if user can make more queries
   */
  async canQuery(walletAddress: string): Promise<QuotaCheck> {
    const tier = await this.getUserTier(walletAddress);
    
    if (tier === 'free') {
      return {
        allowed: false,
        reason: 'Free tier does not include Platform RAG queries. Use Private RAG (local-only).',
        currentUsage: 0,
        quota: 0
      };
    }

    // Reset daily usage if needed
    await this.resetDailyUsageIfNeeded(walletAddress);
    
    const quota = RAG_TIER_QUOTAS[tier].queryRateLimit;
    
    try {
      const usage = await this.getOrCreateUsage(walletAddress);
      
      if (usage.queriesToday >= quota) {
        return {
          allowed: false,
          reason: `Daily query limit reached. ${tier} tier: ${quota.toLocaleString()} queries/day. Resets at midnight UTC.`,
          currentUsage: usage.queriesToday,
          quota: quota
        };
      }
      
      return {
        allowed: true,
        currentUsage: usage.queriesToday,
        quota: quota
      };
    } catch (error) {
      this.logger.error('Error checking query quota:', error);
      return { allowed: false, reason: 'Error checking quota' };
    }
  }

  /**
   * Get or create user usage record
   */
  private async getOrCreateUsage(walletAddress: string) {
    const normalizedAddress = walletAddress.toLowerCase();
    
    let usage = await this.prisma.rAGUserUsage.findUnique({
      where: { walletAddress: normalizedAddress }
    });
    
    if (!usage) {
      usage = await this.prisma.rAGUserUsage.create({
        data: {
          walletAddress: normalizedAddress,
          storageUsed: 0,
          embeddingsThisMonth: 0,
          queriesToday: 0,
          appConnectionsUsed: 0,
          lastResetDay: new Date(),
          lastResetMonth: new Date()
        }
      });
    }
    
    return usage;
  }

  /**
   * Reset daily usage counters if needed
   */
  private async resetDailyUsageIfNeeded(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const usage = await this.prisma.rAGUserUsage.findUnique({
      where: { walletAddress: normalizedAddress }
    });
    
    if (!usage) return;
    
    const now = new Date();
    const lastReset = new Date(usage.lastResetDay);
    
    // Check if it's a new day
    if (now.getUTCDate() !== lastReset.getUTCDate() ||
        now.getUTCMonth() !== lastReset.getUTCMonth() ||
        now.getUTCFullYear() !== lastReset.getUTCFullYear()) {
      
      await this.prisma.rAGUserUsage.update({
        where: { walletAddress: normalizedAddress },
        data: {
          queriesToday: 0,
          lastResetDay: now
        }
      });
    }
  }

  /**
   * Reset monthly usage counters if needed
   */
  private async resetMonthlyUsageIfNeeded(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const usage = await this.prisma.rAGUserUsage.findUnique({
      where: { walletAddress: normalizedAddress }
    });
    
    if (!usage) return;
    
    const now = new Date();
    const lastReset = new Date(usage.lastResetMonth);
    
    // Check if it's a new month
    if (now.getUTCMonth() !== lastReset.getUTCMonth() ||
        now.getUTCFullYear() !== lastReset.getUTCFullYear()) {
      
      await this.prisma.rAGUserUsage.update({
        where: { walletAddress: normalizedAddress },
        data: {
          embeddingsThisMonth: 0,
          lastResetMonth: now
        }
      });
    }
  }

  /**
   * Record storage usage
   */
  async recordStorage(walletAddress: string, bytes: number): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    await this.prisma.rAGUserUsage.update({
      where: { walletAddress: normalizedAddress },
      data: {
        storageUsed: { increment: bytes }
      }
    });
  }

  /**
   * Record embedding generation
   */
  async recordEmbeddings(walletAddress: string, count: number): Promise<void> {
    await this.resetMonthlyUsageIfNeeded(walletAddress);
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    await this.prisma.rAGUserUsage.update({
      where: { walletAddress: normalizedAddress },
      data: {
        embeddingsThisMonth: { increment: count }
      }
    });
  }

  /**
   * Record app connection
   */
  async recordAppConnection(walletAddress: string): Promise<void> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    await this.prisma.rAGUserUsage.update({
      where: { walletAddress: normalizedAddress },
      data: {
        appConnectionsUsed: { increment: 1 }
      }
    });
  }

  /**
   * Record query
   */
  async recordQuery(walletAddress: string): Promise<void> {
    await this.resetDailyUsageIfNeeded(walletAddress);
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    await this.prisma.rAGUserUsage.update({
      where: { walletAddress: normalizedAddress },
      data: {
        queriesToday: { increment: 1 }
      }
    });
  }

  /**
   * Get user's quota status
   */
  async getQuotaStatus(walletAddress: string) {
    const tier = await this.getUserTier(walletAddress);
    const usage = await this.getOrCreateUsage(walletAddress);
    const quota = RAG_TIER_QUOTAS[tier];
    
    return {
      tier,
      storage: {
        used: usage.storageUsed,
        quota: quota.platformStorage,
        available: Math.max(0, quota.platformStorage - usage.storageUsed),
        percentage: quota.platformStorage > 0 
          ? Math.round((usage.storageUsed / quota.platformStorage) * 100)
          : 0
      },
      embeddings: {
        used: usage.embeddingsThisMonth,
        quota: quota.embeddingsPerMonth,
        available: Math.max(0, quota.embeddingsPerMonth - usage.embeddingsThisMonth),
        percentage: quota.embeddingsPerMonth > 0
          ? Math.round((usage.embeddingsThisMonth / quota.embeddingsPerMonth) * 100)
          : 0,
        resetsAt: new Date(usage.lastResetMonth.getTime() + 30 * 24 * 60 * 60 * 1000)
      },
      queries: {
        used: usage.queriesToday,
        quota: quota.queryRateLimit,
        available: Math.max(0, quota.queryRateLimit - usage.queriesToday),
        percentage: quota.queryRateLimit > 0
          ? Math.round((usage.queriesToday / quota.queryRateLimit) * 100)
          : 0,
        resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0))
      },
      apps: {
        used: usage.appConnectionsUsed,
        quota: quota.appConnections === Number.MAX_SAFE_INTEGER ? 'Unlimited' : quota.appConnections,
        available: quota.appConnections === Number.MAX_SAFE_INTEGER 
          ? 'Unlimited' 
          : Math.max(0, quota.appConnections - usage.appConnectionsUsed),
        percentage: quota.appConnections === Number.MAX_SAFE_INTEGER
          ? 0
          : Math.round((usage.appConnectionsUsed / quota.appConnections) * 100)
      }
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default RAGAccessControl;
