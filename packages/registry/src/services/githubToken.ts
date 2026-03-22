import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

interface GitHubTokenData {
  walletAddress: string;
  encryptedToken: string;
  expiresAt?: Date;
}

export class GitHubTokenService {
  private prisma: PrismaClient;
  private encryptionKey: Buffer;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // Use a fixed encryption key from environment for consistency
    // In production, this should be properly managed via a key management service
    const keyEnv = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || 'tais-github-token-key-32-bytes-long!!';
    this.encryptionKey = Buffer.from(keyEnv, 'utf8').slice(0, 32); // Ensure 32 bytes for AES-256
  }

  /**
   * Encrypt a GitHub token using AES-256-GCM
   */
  private encryptToken(token: string): { encryptedToken: string; iv: string } {
    const iv = crypto.randomBytes(12); // GCM recommended IV size
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      encryptedToken: `${encrypted}:${authTag.toString('hex')}`,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt a GitHub token using AES-256-GCM
   */
  private decryptToken(encryptedTokenWithTag: string, ivHex: string): string {
    const [encryptedToken, authTagHex] = encryptedTokenWithTag.split(':');
    if (!authTagHex) {
      throw new Error('Invalid encrypted token format');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', 
      this.encryptionKey, 
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedTokenWithTag.split(':')[0], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Store an encrypted GitHub token for a wallet address
   */
  async storeToken(data: GitHubTokenData): Promise<void> {
    const { encryptedToken: encryptedWithTag, iv } = this.encryptToken(data.encryptedToken);
    
    await this.prisma.githubToken.upsert({
      where: { walletAddress: data.walletAddress },
      update: {
        encryptedToken: encryptedWithTag,
        expiresAt: data.expiresAt,
      },
      create: {
        walletAddress: data.walletAddress,
        encryptedToken: encryptedWithTag,
        expiresAt: data.expiresAt,
      }
    });
  }

  /**
   * Retrieve and decrypt a GitHub token for a wallet address
   */
  async getToken(walletAddress: string): Promise<string | null> {
    const tokenRecord = await this.prisma.githubToken.findUnique({
      where: { walletAddress }
    });

    if (!tokenRecord) {
      return null;
    }

    try {
      const [encryptedToken, ivHex] = tokenRecord.encryptedToken.split(':');
      if (!ivHex) {
        throw new Error('Invalid encrypted token format in database');
      }
      return this.decryptToken(tokenRecord.encryptedToken, ivHex);
    } catch (error) {
      console.error('Failed to decrypt GitHub token:', error);
      return null;
    }
  }

  /**
   * Delete a GitHub token for a wallet address
   */
  async deleteToken(walletAddress: string): Promise<void> {
    await this.prisma.githubToken.delete({
      where: { walletAddress }
    });
  }

  /**
   * Check if a token exists for a wallet address
   */
  async hasToken(walletAddress: string): Promise<boolean> {
    const count = await this.prisma.githubToken.count({
      where: { walletAddress }
    });
    return count > 0;
  }
}