import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * API Key Service
 * Squad Alpha - HIGH-1: API Key Generation with Authentication
 */

export interface ApiKey {
  key: string;
  walletAddress: string;
  permissions: string[];
  rateLimit: number;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface ApiKeyConfig {
  prefix: string;
  length: number;
  defaultExpiryDays: number;
  defaultRateLimit: number;
}

export class ApiKeyService {
  private prisma: PrismaClient;
  private config: ApiKeyConfig;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.config = {
      prefix: process.env.API_KEY_PREFIX || 'tais_',
      length: 48,
      defaultExpiryDays: 30,
      defaultRateLimit: 1000
    };
  }

  /**
   * Generate a new API key
   * HIGH-1 FIX: Requires authenticated wallet address
   */
  async generateKey(
    walletAddress: string,
    permissions: string[] = ['read:skills', 'read:audits'],
    options?: {
      expiresInDays?: number;
      rateLimit?: number;
      name?: string;
    }
  ): Promise<{ key: string; apiKey: Omit<ApiKey, 'key'> }> {
    // Generate cryptographically secure key
    const randomPart = crypto.randomBytes(32).toString('base64url');
    const key = `${this.config.prefix}${randomPart}`;

    // Hash the key for storage (never store raw key)
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || this.config.defaultExpiryDays));

    // Store in database
    const dbKey = await this.prisma.apiKey.create({
      data: {
        keyHash,
        walletAddress: walletAddress.toLowerCase(),
        permissions,
        rateLimit: options?.rateLimit || this.config.defaultRateLimit,
        expiresAt,
        name: options?.name || 'Generated Key',
        requestCount: 0
      }
    });

    return {
      key, // Return raw key only once
      apiKey: {
        walletAddress: dbKey.walletAddress,
        permissions: dbKey.permissions,
        rateLimit: dbKey.rateLimit,
        expiresAt: dbKey.expiresAt ?? new Date(),
        createdAt: dbKey.createdAt,
        lastUsedAt: dbKey.lastUsedAt ?? undefined
      }
    };
  }

  /**
   * Validate an API key
   */
  async validateKey(key: string): Promise<{ 
    valid: boolean; 
    walletAddress?: string;
    permissions?: string[];
    rateLimit?: number;
  }> {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    // Look up in database
    const dbKey = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        expiresAt: { gt: new Date() },
        revokedAt: null
      }
    });

    if (!dbKey) {
      return { valid: false };
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: dbKey.id },
      data: { 
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    });

    return {
      valid: true,
      walletAddress: dbKey.walletAddress,
      permissions: dbKey.permissions,
      rateLimit: dbKey.rateLimit
    };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId: string, walletAddress: string): Promise<boolean> {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        walletAddress: walletAddress.toLowerCase()
      }
    });

    if (!key) {
      return false;
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() }
    });

    return true;
  }

  /**
   * List all API keys for a wallet
   */
  async listKeys(walletAddress: string): Promise<Array<{
    id: string;
    name: string;
    permissions: string[];
    rateLimit: number;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt?: Date;
    requestCount: number;
  }>> {
    const keys = await this.prisma.apiKey.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        revokedAt: null
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
        requestCount: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return keys.map((key: any) => ({
      ...key,
      expiresAt: key.expiresAt ?? new Date(),
      lastUsedAt: key.lastUsedAt ?? undefined
    }));
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.prisma.apiKey.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        revokedAt: null
      }
    });

    return result.count;
  }
}

export default ApiKeyService;
