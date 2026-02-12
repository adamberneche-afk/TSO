import { PrismaClient } from '@prisma/client';

/**
 * Token Blacklist Service - Squad KAPPA
 * Implements INFO-1: JWT token revocation for logout
 * 
 * Note: In production, this should use Redis for performance
 * For MVP, we use PostgreSQL with automatic cleanup
 */

export interface TokenBlacklistEntry {
  tokenHash: string;
  walletAddress: string;
  expiresAt: Date;
  createdAt: Date;
}

export class TokenBlacklistService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Add a token to the blacklist
   * Called during logout
   */
  async blacklistToken(token: string, walletAddress: string): Promise<void> {
    // Create hash of token for storage (don't store raw tokens)
    const tokenHash = await this.hashToken(token);
    
    // Calculate expiration (use JWT exp if available, otherwise 7 days)
    const expiresAt = this.getTokenExpiration(token) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await this.prisma.tokenBlacklist.create({
      data: {
        tokenHash,
        walletAddress: walletAddress.toLowerCase(),
        expiresAt
      }
    });
  }

  /**
   * Check if a token is blacklisted
   * Called during authentication
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = await this.hashToken(token);
    
    const entry = await this.prisma.tokenBlacklist.findUnique({
      where: { tokenHash }
    });
    
    return !!entry;
  }

  /**
   * Clean up expired tokens
   * Should be run periodically (e.g., daily via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    return result.count;
  }

  /**
   * Hash token for secure storage
   */
  private async hashToken(token: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract expiration from JWT token
   */
  private getTokenExpiration(token: string): Date | null {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

export default TokenBlacklistService;
