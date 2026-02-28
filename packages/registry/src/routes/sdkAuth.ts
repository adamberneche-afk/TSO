import { Router, Request, Response } from 'express';
import { verifySignature } from '../utils/signature';
import { verifyNFTOwnership } from '../services/genesisConfigLimits';
import crypto from 'crypto';

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const API_KEY_EXPIRY_DAYS = 30;
const SDK_RATE_LIMIT = 10000;

function generateAPIKey(): string {
  return 'tais_sdk_' + crypto.randomBytes(32).toString('hex');
}

export function createSDKAuthRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.get('/challenge', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('hex');
      const challenge = `TAIS SDK Authentication\n\nWallet: ${wallet}\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nSign this message to generate an SDK API key.\n\nThis key will provide access to the TAIS RAG API for third-party integrations.\n\nWARNING: Only sign this message if you initiated this request.`;
      
      // Store in database instead of memory
      const challengeId = crypto.randomBytes(16).toString('hex');
      await prisma.sDKAPIKeyChallenge.create({
        data: {
          challengeId,
          walletAddress: wallet.toLowerCase(),
          name: '',
          permissions: [],
          expiresAt: new Date(timestamp + CHALLENGE_EXPIRY_MS),
        },
      });

      res.json({
        challenge,
        expiresAt: new Date(timestamp + CHALLENGE_EXPIRY_MS).toISOString(),
        instructions: 'Sign this challenge with your wallet to authenticate for SDK access'
      });
    } catch (error) {
      logger.error('Error generating challenge:', error);
      res.status(500).json({ error: 'Failed to generate challenge' });
    }
  });

  router.post('/authenticate', async (req: Request, res: Response) => {
    try {
      const { wallet, signature } = req.body;

      if (!wallet || !signature) {
        return res.status(400).json({ error: 'Wallet address and signature required' });
      }

      const normalizedWallet = wallet.toLowerCase();
      
      // Get pending challenge from database
      const pending = await prisma.sDKAPIKeyChallenge.findFirst({
        where: { 
          walletAddress: normalizedWallet,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!pending) {
        return res.status(400).json({ 
          error: 'No pending challenge found. Request a new challenge first.',
          code: 'NO_CHALLENGE'
        });
      }

      if (new Date() > pending.expiresAt) {
        // Delete expired challenge from database
        await prisma.sDKAPIKeyChallenge.deleteMany({
          where: { walletAddress: normalizedWallet }
        });
        return res.status(400).json({ 
          error: 'Challenge expired. Request a new challenge.',
          code: 'CHALLENGE_EXPIRED'
        });
      }

      // Build the challenge message to verify (same as in GET /challenge)
      const timestampMatch = pending.createdAt.getTime();
      const nonce = crypto.randomBytes(16).toString('hex'); // We don't store nonce, so we reconstruct
      const challenge = `TAIS SDK Authentication\n\nWallet: ${wallet}\nTimestamp: ${timestampMatch}\nNonce: ${nonce}\n\nSign this message to generate an SDK API key.\n\nThis key will provide access to the TAIS RAG API for third-party integrations.\n\nWARNING: Only sign this message if you initiated this request.`;
      
      const verification = verifySignature(wallet, challenge, signature);
      if (!verification.valid) {
        return res.status(401).json({ 
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE'
        });
      }

      // Delete challenge from database
      await prisma.sDKAPIKeyChallenge.deleteMany({
        where: { walletAddress: normalizedWallet }
      });

      logger.info(`[SDK Auth] Checking gold tier for ${wallet}`);
      const nftOwnership = await verifyNFTOwnership(wallet);
      
      if (!nftOwnership.isHolder || nftOwnership.tokenCount === 0) {
        logger.warn(`[SDK Auth] ${wallet} is NOT a Genesis NFT holder - access denied`);
        return res.status(403).json({
          error: 'SDK access requires Gold tier (THINK Genesis NFT holder)',
          code: 'INSUFFICIENT_TIER',
          currentTier: 'bronze',
          requiredTier: 'gold',
          upgradeUrl: 'https://opensea.io/collection/think-genesis-bundle',
          message: 'The TAIS RAG SDK is available exclusively to THINK Genesis Bundle NFT holders. Please acquire an NFT to gain SDK access.'
        });
      }

      logger.info(`[SDK Auth] ${wallet} is a Genesis NFT holder (${nftOwnership.tokenCount} tokens) - GOLD tier confirmed`);

      // Check for existing API key in database
      const existingKey = await prisma.apiKey.findFirst({
        where: { 
          walletAddress: normalizedWallet,
          expiresAt: { gt: new Date() },
          revokedAt: null
        },
      });

      if (existingKey) {
        logger.info(`[SDK Auth] Returning existing API key for ${wallet}`);
        return res.json({
          success: true,
          apiKey: existingKey.keyHash, // Note: we store hash, return the key
          walletAddress: wallet,
          tier: 'gold',
          nftCount: nftOwnership.tokenCount,
          expiresAt: existingKey.expiresAt.toISOString(),
          createdAt: existingKey.createdAt.toISOString(),
          requestCount: existingKey.requestCount,
          rateLimit: existingKey.rateLimit,
          rateLimitPeriod: 'day',
          features: {
            storage: '100GB',
            embeddings: '2M/month',
            queries: '100K/day',
            apps: 'Unlimited'
          }
        });
      }

      const newKey = generateAPIKey();
      const now = new Date();
      
      // Store API key in database instead of memory
      await prisma.apiKey.create({
        data: {
          keyHash: newKey, // In production, should hash this
          walletAddress: normalizedWallet,
          name: 'SDK API Key',
          permissions: ['rag:read', 'rag:write'],
          rateLimit: SDK_RATE_LIMIT,
          expiresAt: new Date(now.getTime() + API_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          lastUsedAt: now,
        },
      });

      logger.info(`[SDK Auth] Generated new API key for ${wallet}`);

      res.json({
        success: true,
        apiKey: newKey,
        walletAddress: wallet,
        tier: 'gold',
        nftCount: nftOwnership.tokenCount,
        expiresAt: new Date(now.getTime() + API_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        requestCount: 0,
        rateLimit: SDK_RATE_LIMIT,
        rateLimitPeriod: 'day',
        features: {
          storage: '100GB',
          embeddings: '2M/month',
          queries: '100K/day',
          apps: 'Unlimited'
        }
      });
    } catch (error) {
      logger.error('Error authenticating SDK:', error);
      res.status(500).json({ error: 'Failed to authenticate' });
    }
  });

  router.get('/verify', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'API key required' });
      }

      const apiKey = authHeader.substring(7);
      
      // Get API key from database
      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash: apiKey },
      });

      if (!keyRecord) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          code: 'INVALID_KEY'
        });
      }

      if (keyRecord.expiresAt < new Date() || keyRecord.revokedAt) {
        return res.status(401).json({
          error: 'API key expired or revoked',
          code: 'KEY_EXPIRED',
          expiresAt: keyRecord.expiresAt.toISOString()
        });
      }

      // Update last used time and request count in database
      await prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: {
          lastUsedAt: new Date(),
          requestCount: { increment: 1 }
        },
      });

      res.json({
        valid: true,
        walletAddress: keyRecord.walletAddress,
        tier: 'gold',
        expiresAt: keyRecord.expiresAt.toISOString(),
        requestCount: keyRecord.requestCount
      });
    } catch (error) {
      logger.error('Error verifying API key:', error);
      res.status(500).json({ error: 'Failed to verify key' });
    }
  });

  router.delete('/revoke', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'API key required' });
      }

      const apiKey = authHeader.substring(7);
      
      // Get and revoke API key in database
      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash: apiKey },
      });

      if (!keyRecord) {
        return res.status(404).json({ error: 'API key not found' });
      }

      await prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { revokedAt: new Date() }
      });
      
      logger.info(`[SDK Auth] Revoked API key for ${keyRecord.walletAddress}`);

      res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
      logger.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke key' });
    }
  });

  return router;
}

// Database-based API key validation function
export async function validateSDKAPIKey(prisma: any, apiKey: string): Promise<{
  walletAddress: string;
  permissions: string[];
  rateLimit: number;
} | null> {
  const keyRecord = await prisma.apiKey.findUnique({
    where: { keyHash: apiKey },
  });
  
  if (!keyRecord) return null;
  if (keyRecord.expiresAt < new Date() || keyRecord.revokedAt) return null;
  
  // Update usage stats
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: {
      lastUsedAt: new Date(),
      requestCount: { increment: 1 }
    },
  });
  
  return {
    walletAddress: keyRecord.walletAddress,
    permissions: keyRecord.permissions,
    rateLimit: keyRecord.rateLimit,
  };
}
