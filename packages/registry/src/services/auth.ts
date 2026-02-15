import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto, { timingSafeEqual } from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Authentication Service
 * Squad Alpha - Critical Fixes: JWT Secret & Signature Verification
 * BLOCKER-3 FIX: Added logger parameter for structured logging
 */

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  signatureMessage: string;
}

export interface JWTPayload {
  walletAddress: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private config: AuthConfig;
  private prisma: PrismaClient;
  private logger: any;

  constructor(prisma: PrismaClient, logger?: any) {
    // CRITICAL FIX: No fallback for JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    // Squad Epsilon Fix: MEDIUM-4 - Constant-time comparison to prevent timing attacks
    const defaults = [
      'your_super_secret_jwt_key_change_in_production',
      'dev-secret'
    ];
    
    for (const defaultVal of defaults) {
      if (jwtSecret.length === defaultVal.length) {
        try {
          const isDefault = timingSafeEqual(
            Buffer.from(jwtSecret),
            Buffer.from(defaultVal)
          );
          if (isDefault) {
            throw new Error('JWT_SECRET cannot be a default value');
          }
        } catch {
          // Length mismatch, continue to next check
        }
      }
    }

    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }

    this.config = {
      jwtSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      signatureMessage: process.env.AUTH_SIGNATURE_MESSAGE || 'TAIS Platform Authentication'
    };

    this.prisma = prisma;
    this.logger = logger || console;
  }

  /**
   * CRITICAL FIX-2: Verify Ethereum signature
   * Validates that the signature was created by the claimed wallet address
   */
  async verifySignature(
    walletAddress: string, 
    signature: string, 
    nonce: string
  ): Promise<boolean> {
    try {
      // Validate address format
      if (!ethers.isAddress(walletAddress)) {
        this.logger.error({ walletAddress }, 'Invalid wallet address format');
        return false;
      }

      // Normalize address
      const normalizedAddress = walletAddress.toLowerCase();

      // Create message to verify (must match format in nonce endpoint)
      const message = `${this.config.signatureMessage}\n\nNonce: ${nonce}`;

      // Recover address from signature
      const recoveredAddress = ethers.verifyMessage(message, signature);

      // Compare normalized addresses
      const isValid = recoveredAddress.toLowerCase() === normalizedAddress;

      if (!isValid) {
        this.logger.warn({ walletAddress }, 'Signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error({ error, walletAddress }, 'Signature verification error');
      return false;
    }
  }

  /**
   * Generate a nonce for signature requests
   */
  generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate JWT token after successful signature verification
   */
  generateToken(walletAddress: string): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      walletAddress: walletAddress.toLowerCase()
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'tais-platform',
      audience: 'tais-api'
    });
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'tais-platform',
        audience: 'tais-api'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from request header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Store nonce in database for replay protection
   */
  async storeNonce(walletAddress: string, nonce: string): Promise<void> {
    // Invalidate old nonces for this wallet
    await this.prisma.authNonce.deleteMany({
      where: { walletAddress: walletAddress.toLowerCase() }
    });

    // Store new nonce (expires in 5 minutes)
    await this.prisma.authNonce.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
  }

  /**
   * Validate and consume nonce
   */
  async validateNonce(walletAddress: string, nonce: string): Promise<boolean> {
    try {
      // Squad Epsilon Fix: HIGH-1 - Atomic nonce validation using delete with where
      // This prevents race conditions by combining find and delete into single operation
      await this.prisma.authNonce.delete({
        where: {
          walletAddress_nonce: {
            walletAddress: walletAddress.toLowerCase(),
            nonce
          },
          expiresAt: { gt: new Date() }
        }
      });
      
      // If delete succeeded, nonce was valid and is now consumed
      return true;
    } catch (error) {
      // Record didn't exist or was already expired/consumed
      this.logger.warn({ walletAddress, nonce }, 'Invalid or expired nonce');
      return false;
    }
  }

  /**
   * Login flow with signature verification
   */
  async login(
    walletAddress: string, 
    signature: string, 
    nonce: string
  ): Promise<{ token: string; expiresIn: string }> {
    // Validate nonce (prevents replay attacks)
    const isValidNonce = await this.validateNonce(walletAddress, nonce);
    if (!isValidNonce) {
      throw new Error('Invalid or expired nonce');
    }

    // Verify signature
    const isValidSignature = await this.verifySignature(walletAddress, signature, nonce);
    if (!isValidSignature) {
      throw new Error('Invalid signature');
    }

    // Generate JWT
    const token = this.generateToken(walletAddress);

    return {
      token,
      expiresIn: this.config.jwtExpiresIn
    };
  }
}

export default AuthService;
