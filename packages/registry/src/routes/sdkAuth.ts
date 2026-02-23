import { Router, Request, Response } from 'express';
import { verifySignature } from '../utils/signature';
import { verifyNFTOwnership } from '../services/genesisConfigLimits';
import crypto from 'crypto';

interface SDKAPIKey {
  key: string;
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  requestCount: number;
}

const apiKeys = new Map<string, SDKAPIKey>();
const pendingChallenges = new Map<string, { challenge: string; expiresAt: number }>();

const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;
const API_KEY_EXPIRY_DAYS = 30;
const SDK_RATE_LIMIT = 10000;

function generateAPIKey(): string {
  return 'tais_sdk_' + crypto.randomBytes(32).toString('hex');
}

function generateChallenge(walletAddress: string): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const challenge = `TAIS SDK Authentication\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nSign this message to generate an SDK API key.\n\nThis key will provide access to the TAIS RAG API for third-party integrations.\n\nWARNING: Only sign this message if you initiated this request.`;
  
  pendingChallenges.set(walletAddress.toLowerCase(), {
    challenge,
    expiresAt: timestamp + CHALLENGE_EXPIRY_MS
  });
  
  return challenge;
}

export function createSDKAuthRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.get('/challenge', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const challenge = generateChallenge(wallet);

      res.json({
        challenge,
        expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString(),
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
      const pending = pendingChallenges.get(normalizedWallet);

      if (!pending) {
        return res.status(400).json({ 
          error: 'No pending challenge found. Request a new challenge first.',
          code: 'NO_CHALLENGE'
        });
      }

      if (Date.now() > pending.expiresAt) {
        pendingChallenges.delete(normalizedWallet);
        return res.status(400).json({ 
          error: 'Challenge expired. Request a new challenge.',
          code: 'CHALLENGE_EXPIRED'
        });
      }

      const verification = verifySignature(pending.challenge, signature, wallet);
      if (!verification.valid) {
        return res.status(401).json({ 
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE'
        });
      }

      pendingChallenges.delete(normalizedWallet);

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

      const existingKey = Array.from(apiKeys.values()).find(
        k => k.walletAddress === normalizedWallet && k.expiresAt > new Date()
      );

      if (existingKey) {
        logger.info(`[SDK Auth] Returning existing API key for ${wallet}`);
        return res.json({
          success: true,
          apiKey: existingKey.key,
          walletAddress: wallet,
          tier: 'gold',
          nftCount: nftOwnership.tokenCount,
          expiresAt: existingKey.expiresAt.toISOString(),
          createdAt: existingKey.createdAt.toISOString(),
          requestCount: existingKey.requestCount,
          rateLimit: SDK_RATE_LIMIT,
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
      const keyRecord: SDKAPIKey = {
        key: newKey,
        walletAddress: normalizedWallet,
        createdAt: now,
        expiresAt: new Date(now.getTime() + API_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        lastUsedAt: now,
        requestCount: 0
      };

      apiKeys.set(newKey, keyRecord);

      logger.info(`[SDK Auth] Generated new API key for ${wallet}`);

      res.json({
        success: true,
        apiKey: newKey,
        walletAddress: wallet,
        tier: 'gold',
        nftCount: nftOwnership.tokenCount,
        expiresAt: keyRecord.expiresAt.toISOString(),
        createdAt: keyRecord.createdAt.toISOString(),
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
      const keyRecord = apiKeys.get(apiKey);

      if (!keyRecord) {
        return res.status(401).json({ 
          error: 'Invalid API key',
          code: 'INVALID_KEY'
        });
      }

      if (keyRecord.expiresAt < new Date()) {
        apiKeys.delete(apiKey);
        return res.status(401).json({
          error: 'API key expired',
          code: 'KEY_EXPIRED',
          expiresAt: keyRecord.expiresAt.toISOString()
        });
      }

      keyRecord.lastUsedAt = new Date();
      keyRecord.requestCount++;

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
      const keyRecord = apiKeys.get(apiKey);

      if (!keyRecord) {
        return res.status(404).json({ error: 'API key not found' });
      }

      apiKeys.delete(apiKey);
      logger.info(`[SDK Auth] Revoked API key for ${keyRecord.walletAddress}`);

      res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
      logger.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke key' });
    }
  });

  return router;
}

export function validateSDKAPIKey(apiKey: string): SDKAPIKey | null {
  const keyRecord = apiKeys.get(apiKey);
  
  if (!keyRecord) return null;
  if (keyRecord.expiresAt < new Date()) {
    apiKeys.delete(apiKey);
    return null;
  }
  
  keyRecord.lastUsedAt = new Date();
  keyRecord.requestCount++;
  
  return keyRecord;
}

export { apiKeys };
