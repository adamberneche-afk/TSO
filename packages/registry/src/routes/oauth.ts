import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import cryptoJS from 'crypto-js';
import { verifySignature } from '../utils/signature';
import { verifyNFTOwnership } from '../services/genesisConfigLimits';

const TOKEN_EXPIRY_DAYS = 30;
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

function getEncryptionKey(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required in production');
    }
    return 'tais-default-encryption-key-32b';
  }
  return key;
}

const ENCRYPTION_KEY = getEncryptionKey();

function encryptToken(token: string): string {
  return cryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

function decryptToken(encrypted: string): string {
  const bytes = cryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(cryptoJS.enc.Utf8);
}

function generateAccessToken(): string {
  return 'tais_at_' + crypto.randomBytes(32).toString('hex');
}

function generateRefreshToken(): string {
  return 'tais_rt_' + crypto.randomBytes(32).toString('hex');
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function generateAuthorizationId(): string {
  return 'auth_' + crypto.randomBytes(16).toString('hex');
}

const VALID_SCOPES = [
  'agent:identity:read',
  'agent:identity:soul:read',
  'agent:identity:profile:read',
  'agent:memory:read',
  'agent:memory:write',
  'agent:config:read',
];

function validateScopes(scopes: string[]): { valid: boolean; invalid: string[] } {
  const invalid = scopes.filter(s => !VALID_SCOPES.includes(s));
  return { valid: invalid.length === 0, invalid };
}

export function createOAuthRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.get('/authorize', async (req: Request, res: Response) => {
    try {
      const { app_id, scopes: scopesParam, redirect_uri, state, wallet } = req.query;

      if (!app_id || typeof app_id !== 'string') {
        return res.status(400).json({ error: 'app_id is required' });
      }

      if (!redirect_uri || typeof redirect_uri !== 'string') {
        return res.status(400).json({ error: 'redirect_uri is required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      const scopes = scopesParam 
        ? (Array.isArray(scopesParam) 
            ? (scopesParam as string[]) 
            : (scopesParam as string).split(','))
        : [];
      
      const validScopes = scopes as string[];
      const { valid, invalid } = validateScopes(validScopes);
      if (!valid) {
        return res.status(400).json({ error: `Invalid scopes: ${invalid.join(', ')}` });
      }

      const app = await prisma.agentApp.findUnique({
        where: { appId: app_id },
      });

      if (!app) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (!app.isActive) {
        return res.status(403).json({ error: 'Application is disabled' });
      }

      if (!app.redirectUris.includes(redirect_uri)) {
        return res.status(400).json({ error: 'Invalid redirect_uri' });
      }

      const authorizationId = generateAuthorizationId();
      
      // Store in database for persistence across server restarts
      await prisma.oAuthPendingAuthorization.create({
        data: {
          state: authorizationId,
          walletAddress: wallet.toLowerCase(),
          appId: app_id,
          scopes,
          redirectUri: redirect_uri,
          expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
        },
      });

      const appInfo = {
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
        requestedScopes: scopes,
        walletAddress: wallet,
      };

      res.json({
        authorizationId,
        app: appInfo,
        message: 'Authorization pending wallet signature',
      });
    } catch (error) {
      logger.error('OAuth authorize error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  });

  router.post('/approve', async (req: Request, res: Response) => {
    try {
      const { authorizationId, signature, wallet } = req.body;

      if (!authorizationId || !signature || !wallet) {
        return res.status(400).json({ error: 'authorizationId, signature, and wallet required' });
      }

      // Retrieve from database
      const pending = await prisma.oAuthPendingAuthorization.findUnique({
        where: { state: authorizationId },
      });
      
      if (!pending) {
        return res.status(400).json({ error: 'Authorization not found or expired' });
      }

      if (pending.walletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Wallet mismatch' });
      }

      if (new Date() > pending.expiresAt) {
        await prisma.oAuthPendingAuthorization.delete({ where: { state: authorizationId } });
        return res.status(400).json({ error: 'Authorization expired' });
      }

      const challenge = `TAIS OAuth Authorization\n\nApp: ${pending.appId}\nScopes: ${pending.scopes.join(', ')}\nWallet: ${pending.walletAddress}\nNonce: ${authorizationId}`;
      
      const isValid = await verifySignature(wallet, challenge, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const accessToken = generateAccessToken();
      const refreshToken = generateRefreshToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await prisma.agentAppPermission.upsert({
        where: {
          walletAddress_appId: {
            walletAddress: pending.walletAddress,
            appId: pending.appId,
          },
        },
        update: {
          scopes: pending.scopes,
          accessToken: encryptToken(accessToken),
          refreshToken: encryptToken(refreshToken),
          expiresAt,
          grantedAt: new Date(),
          revokedAt: null,
        },
        create: {
          walletAddress: pending.walletAddress,
          appId: pending.appId,
          scopes: pending.scopes,
          accessToken: encryptToken(accessToken),
          refreshToken: encryptToken(refreshToken),
          expiresAt,
        },
      });

      // Delete from database after successful approval
      await prisma.oAuthPendingAuthorization.delete({ where: { state: authorizationId } });

      const params = new URLSearchParams({
        code: accessToken,
        state: pending.state,
      });

      res.json({
        success: true,
        redirectUri: `${pending.redirectUri}?${params.toString()}`,
      });
    } catch (error) {
      logger.error('OAuth approve error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  });

  router.post('/token', async (req: Request, res: Response) => {
    try {
      const { grant_type, code, refresh_token, app_id, app_secret } = req.body;

      if (!app_id || !app_secret) {
        return res.status(400).json({ error: 'app_id and app_secret required' });
      }

      const app = await prisma.agentApp.findUnique({
        where: { appId: app_id },
      });

      if (!app) {
        return res.status(401).json({ error: 'Invalid application credentials' });
      }

      if (hashSecret(app_secret) !== app.appSecret) {
        return res.status(401).json({ error: 'Invalid application credentials' });
      }

      if (grant_type === 'authorization_code' && code) {
        const permission = await prisma.agentAppPermission.findFirst({
          where: {
            appId: app_id,
            accessToken: encryptToken(code),
            revokedAt: null,
          },
        });

        if (!permission) {
          return res.status(401).json({ error: 'Invalid or expired authorization code' });
        }

        if (new Date() > permission.expiresAt) {
          return res.status(401).json({ error: 'Authorization code expired' });
        }

        const newAccessToken = generateAccessToken();
        const newRefreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        await prisma.agentAppPermission.update({
          where: { id: permission.id },
          data: {
            accessToken: encryptToken(newAccessToken),
            refreshToken: encryptToken(newRefreshToken),
            expiresAt,
          },
        });

        res.json({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          token_type: 'Bearer',
          expires_in: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
          walletAddress: permission.walletAddress,
          scopes: permission.scopes,
        });
      } else if (grant_type === 'refresh_token' && refresh_token) {
        const permission = await prisma.agentAppPermission.findFirst({
          where: {
            appId: app_id,
            refreshToken: encryptToken(refresh_token),
            revokedAt: null,
          },
        });

        if (!permission) {
          return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken();
        const newRefreshToken = generateRefreshToken();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        await prisma.agentAppPermission.update({
          where: { id: permission.id },
          data: {
            accessToken: encryptToken(newAccessToken),
            refreshToken: encryptToken(newRefreshToken),
            expiresAt,
          },
        });

        res.json({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          token_type: 'Bearer',
          expires_in: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
          walletAddress: permission.walletAddress,
          scopes: permission.scopes,
        });
      } else {
        return res.status(400).json({ error: 'Invalid grant_type. Use authorization_code or refresh_token' });
      }
    } catch (error) {
      logger.error('OAuth token error:', error);
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  router.post('/revoke', async (req: Request, res: Response) => {
    try {
      const { access_token, wallet, app_id } = req.body;

      if (!access_token || !wallet || !app_id) {
        return res.status(400).json({ error: 'access_token, wallet, and app_id required' });
      }

      const permission = await prisma.agentAppPermission.findFirst({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId: app_id,
          accessToken: encryptToken(access_token),
          revokedAt: null,
        },
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }

      await prisma.agentAppPermission.update({
        where: { id: permission.id },
        data: { revokedAt: new Date() },
      });

      res.json({ success: true, message: 'Access revoked' });
    } catch (error) {
      logger.error('OAuth revoke error:', error);
      res.status(500).json({ error: 'Revocation failed' });
    }
  });

  router.get('/permissions', async (req: Request, res: Response) => {
    try {
      const { wallet, app_id } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      const where: any = { walletAddress: wallet.toLowerCase(), revokedAt: null };
      
      if (app_id) {
        where.appId = app_id as string;
      }

      const permissions = await prisma.agentAppPermission.findMany({
        where,
        include: {
          app: {
            select: {
              appId: true,
              name: true,
              description: true,
              iconUrl: true,
            },
          },
        },
      });

      res.json({
        permissions: permissions.map((p: { app: { appId: string; name: string }; scopes: string[]; grantedAt: Date; expiresAt: Date | null }) => ({
          appId: p.app.appId,
          appName: p.app.name,
          scopes: p.scopes,
          grantedAt: p.grantedAt,
          expiresAt: p.expiresAt,
        })),
      });
    } catch (error) {
      logger.error('OAuth permissions error:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  });

  router.post('/register-app', async (req: Request, res: Response) => {
    try {
      const { appId, name, description, redirectUris, websiteUrl, developerEmail, developerName, wallet, signature } = req.body;

      if (!appId || !name || !redirectUris || !wallet || !signature) {
        return res.status(400).json({ error: 'appId, name, redirectUris, wallet, and signature required' });
      }

      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        return res.status(400).json({ error: 'At least one redirect URI is required' });
      }

      const existing = await prisma.agentApp.findUnique({
        where: { appId },
      });

      if (existing) {
        return res.status(409).json({ error: 'App ID already exists' });
      }

      const appSecret = crypto.randomBytes(32).toString('hex');
      
      const challenge = `TAIS App Registration\n\nApp ID: ${appId}\nApp Name: ${name}\nWallet: ${wallet}\nTimestamp: ${Date.now()}`;
      
      const isValid = await verifySignature(wallet, challenge, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const nftResult = await verifyNFTOwnership(wallet);
      const tier = nftResult.isHolder ? (nftResult.tokenCount >= 3 ? 'gold' : 'silver') : 'free';
      const isGold = tier === 'gold';

      const app = await prisma.agentApp.create({
        data: {
          appId,
          name,
          description: description || null,
          websiteUrl: websiteUrl || null,
          redirectUris,
          appSecret: hashSecret(appSecret),
          tier: isGold ? 'GOLD' : 'BASIC',
          developerEmail: developerEmail || null,
          developerName: developerName || null,
        },
      });

      res.json({
        success: true,
        app: {
          appId: app.appId,
          name: app.name,
          appSecret,
          tier: app.tier,
          redirectUris: app.redirectUris,
        },
        message: 'Save your app secret securely. It will not be shown again.',
      });
    } catch (error) {
      logger.error('OAuth register-app error:', error);
      res.status(500).json({ error: 'Failed to register app' });
    }
  });

  router.get('/apps', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      const nftResult = await verifyNFTOwnership(wallet);
      const tier = nftResult.isHolder ? (nftResult.tokenCount >= 3 ? 'gold' : 'silver') : 'free';
      if (tier === 'free') {
        return res.status(403).json({ error: 'Genesis NFT required to list apps' });
      }

      const apps = await prisma.agentApp.findMany({
        where: {
          isActive: true,
        },
        select: {
          appId: true,
          name: true,
          description: true,
          iconUrl: true,
          websiteUrl: true,
          tier: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ apps });
    } catch (error) {
      logger.error('OAuth apps error:', error);
      res.status(500).json({ error: 'Failed to fetch apps' });
    }
  });

  // ============================================
  // Sandbox Environment (for testing)
  // ============================================

  // Create sandbox app for testing
  router.post('/sandbox/create', async (req: Request, res: Response) => {
    try {
      const { wallet, name } = req.body;

      if (!wallet || !name) {
        return res.status(400).json({ error: 'wallet and name are required' });
      }

      const sandboxAppId = 'sandbox_' + crypto.randomBytes(8).toString('hex');
      const sandboxSecret = crypto.randomBytes(24).toString('hex');

      const app = await prisma.agentApp.create({
        data: {
          appId: sandboxAppId,
          name: `${name} (Sandbox)`,
          description: 'Sandbox test environment',
          websiteUrl: 'https://sandbox.local',
          redirectUris: ['http://localhost:3000/callback', 'http://localhost:5173/callback'],
          appSecret: hashSecret(sandboxSecret),
          tier: 'BASIC',
          isActive: true,
        },
      });

      logger.info(`Sandbox app created: ${sandboxAppId} for wallet ${wallet}`);

      res.json({
        success: true,
        sandbox: true,
        app: {
          appId: app.appId,
          name: app.name,
          appSecret: sandboxSecret,
          redirectUris: app.redirectUris,
        },
        message: 'Sandbox app created. Store the secret securely - it will not be shown again.',
      });
    } catch (error) {
      logger.error('Sandbox create error:', error);
      res.status(500).json({ error: 'Failed to create sandbox app' });
    }
  });

  // Get sandbox status
  router.get('/sandbox/status', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      const sandboxApps = await prisma.agentApp.findMany({
        where: {
          appId: { startsWith: 'sandbox_' },
          developerEmail: wallet.toLowerCase(),
        },
        select: {
          appId: true,
          name: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        wallet,
        sandboxApps,
        rateLimit: {
          requestsPerMinute: 60,
          maxRequests: 1000,
        },
        features: {
          mockOAuth: true,
          testTokens: true,
          debugMode: true,
        },
      });
    } catch (error) {
      logger.error('Sandbox status error:', error);
      res.status(500).json({ error: 'Failed to fetch sandbox status' });
    }
  });

  // Generate test token for sandbox
  router.post('/sandbox/token', async (req: Request, res: Response) => {
    try {
      const { wallet, appId } = req.body;

      if (!wallet || !appId) {
        return res.status(400).json({ error: 'wallet and appId are required' });
      }

      if (!appId.startsWith('sandbox_')) {
        return res.status(400).json({ error: 'App must be a sandbox app' });
      }

      const testToken = 'sandbox_tk_' + crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.agentAppPermission.upsert({
        where: {
          walletAddress_appId: {
            walletAddress: wallet.toLowerCase(),
            appId,
          },
        },
        update: {
          accessToken: encryptToken(testToken),
          expiresAt,
        },
        create: {
          walletAddress: wallet.toLowerCase(),
          appId,
          scopes: ['agent:identity:read', 'agent:memory:read', 'agent:memory:write'],
          accessToken: encryptToken(testToken),
          expiresAt,
        },
      });

      res.json({
        success: true,
        sandbox: true,
        access_token: testToken,
        token_type: 'Bearer',
        expires_in: 86400,
        walletAddress: wallet,
        scopes: ['agent:identity:read', 'agent:memory:read', 'agent:memory:write'],
        note: 'This is a test token valid for 24 hours',
      });
    } catch (error) {
      logger.error('Sandbox token error:', error);
      res.status(500).json({ error: 'Failed to generate test token' });
    }
  });

  return router;
}
