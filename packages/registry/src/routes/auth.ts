import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth';
import { ApiKeyService } from '../services/apiKey';
import { authLoginSchema, apiKeySchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  prisma?: PrismaClient;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

const router = Router();

/**
 * POST /api/v1/auth/nonce
 * Get a nonce for signature verification
 */
router.post('/nonce', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    
    const { walletAddress } = req.body;
    
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address',
        message: 'Please provide a valid Ethereum address'
      });
    }
    
    // Generate and store nonce
    const nonce = authService.generateNonce();
    await authService.storeNonce(walletAddress, nonce);
    
    // Return message to sign (must match format in verifySignature)
    const message = `${process.env.AUTH_SIGNATURE_MESSAGE || 'TAIS Platform Authentication'}\n\nNonce: ${nonce}`;
    
    res.json({
      nonce,
      message,
      expiresIn: '5 minutes'
    });
  } catch (error) {
     req.log?.error({ error }, 'Nonce generation error');
    res.status(500).json({
      error: 'Failed to generate nonce',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate with wallet signature
 * CRITICAL FIX-2: Now verifies Ethereum signatures properly
 */
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = req.prisma as PrismaClient;
    const authService = new AuthService(prisma);
    
    // Squad Beta: Validate input using Zod
    const validation = validateInput(authLoginSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { walletAddress, signature, nonce } = validation.data;
    
    // Authenticate with signature verification
    const { token, expiresIn } = await authService.login(walletAddress, signature, nonce);
    
    res.json({
      token,
      walletAddress,
      expiresIn
    });
  } catch (error) {
     req.log?.error({ error }, 'Login error');
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid credentials'
    });
  }
});

/**
 * POST /api/v1/auth/verify
 * Verify JWT token
 */
router.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Please provide a token to verify'
      });
    }
    
    const decoded = authService.validateToken(token);
    
    res.json({
      valid: true,
      walletAddress: decoded.walletAddress,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid or expired token'
    });
  }
});

/**
 * POST /api/v1/auth/api-key
 * Generate API key (requires authentication)
 * HIGH-1 FIX: Now requires valid authentication
 */
router.post('/api-key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    const apiKeyService = new ApiKeyService(req.prisma as PrismaClient);
    
    // Extract and validate token
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'API key generation requires authentication'
      });
    }
    
    // Validate JWT
    const decoded = authService.validateToken(token);
    
    // Squad Beta: Validate input
    const validation = validateInput(apiKeySchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { permissions, expiresInDays, name } = validation.data;
    
    // Generate API key
    const { key, apiKey } = await apiKeyService.generateKey(
      decoded.walletAddress,
      permissions,
      { expiresInDays, name }
    );
    
    res.json({
      apiKey: key,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      message: 'Store this API key securely. It will not be shown again.'
    });
  } catch (error) {
     req.log?.error({ error }, 'API key generation error');
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
});

/**
 * GET /api/v1/auth/api-keys
 * List all API keys for authenticated user
 */
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    const apiKeyService = new ApiKeyService(req.prisma as PrismaClient);
    
    // Extract and validate token
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    const decoded = authService.validateToken(token);
    
    // Get user's API keys
    const keys = await apiKeyService.listKeys(decoded.walletAddress);
    
    res.json({
      keys,
      total: keys.length
    });
  } catch (error) {
    res.status(401).json({
      error: 'Authentication failed'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user and invalidate JWT token
 * Squad KAPPA Fix: INFO-1 - JWT token revocation
 */
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    const tokenBlacklist = new (await import('../services/tokenBlacklist')).TokenBlacklistService(req.prisma as PrismaClient);
    
    // Extract token
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }
    
    // Validate token first
    const decoded = authService.validateToken(token);
    
    // Add token to blacklist
    await tokenBlacklist.blacklistToken(token, decoded.walletAddress);
    
     req.log?.info({
       walletAddress: decoded.walletAddress
     }, 'User logged out, token blacklisted');
    
    res.json({
      message: 'Logged out successfully',
      walletAddress: decoded.walletAddress
    });
  } catch (error) {
     req.log?.error({ error }, 'Logout failed');
    res.status(401).json({
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
});

// GET /api/v1/auth/memory-preferences - Get memory report preferences
router.get('/memory-preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = authService.validateToken(token);
    
    let prefs = await (req.prisma as PrismaClient).memoryReportPreferences.findUnique({
      where: { walletAddress: decoded.walletAddress },
    });
    
     if (!prefs) {
       prefs = await (req.prisma as PrismaClient).memoryReportPreferences.create({
         data: { walletAddress: decoded.walletAddress },
       });
     }
    
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PATCH /api/v1/auth/memory-preferences - Update memory report preferences
router.patch('/memory-preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authService = new AuthService(req.prisma as PrismaClient);
    
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = authService.validateToken(token);
    
     const {
       reportFrequency,
       includeDriftStats,
       includeUsagePatterns,
       includeAppUsage,
       includeRagPools,
       includeAlignmentIndex,
       notifyOnFlag,
       notifyOnDrift,
     } = req.body;
     
     const prefs = await (req.prisma as PrismaClient).memoryReportPreferences.upsert({
       where: { walletAddress: decoded.walletAddress },
       update: {
         ...(reportFrequency && { reportFrequency }),
         ...(includeDriftStats !== undefined && { includeDriftStats }),
         ...(includeUsagePatterns !== undefined && { includeUsagePatterns }),
         ...(includeAppUsage !== undefined && { includeAppUsage }),
         ...(includeRagPools !== undefined && { includeRagPools }),
         ...(includeAlignmentIndex !== undefined && { includeAlignmentIndex }),
         ...(notifyOnFlag !== undefined && { notifyOnFlag }),
         ...(notifyOnDrift !== undefined && { notifyOnDrift }),
       },
       create: {
         walletAddress: decoded.walletAddress,
         reportFrequency: reportFrequency || 'weekly',
         includeDriftStats: includeDriftStats ?? true,
         includeUsagePatterns: includeUsagePatterns ?? true,
         includeAppUsage: includeAppUsage ?? true,
         includeRagPools: includeRagPools ?? true,
         includeAlignmentIndex: includeAlignmentIndex ?? true,
         notifyOnFlag: notifyOnFlag ?? true,
         notifyOnDrift: notifyOnDrift ?? true,
       },
     });
    
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export { router as authRoutes };
