import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifySignature } from '../utils/signature';
import crypto from 'crypto';

interface RAGSession {
  sessionId: string;
  walletAddress: string;
  tier: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  documentCount: number;
  bytesUploaded: number;
}

// Database-backed session storage instead of in-memory Map
// This provides persistence and scalability across multiple instances

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS_PER_WALLET = 3;

function generateSessionId(): string {
  return 'rag_sess_' + crypto.randomBytes(32).toString('hex');
}

// In-memory cache for active sessions to reduce database queries
// This is a performance optimization - the source of truth is still the database
const sessionCache = new Map<string, { session: RAGSession; expiry: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function getActiveSessions(): Map<string, RAGSession> {
  // Note: This is primarily for debugging/monitoring
  // In production, you'd query the database directly
  return new Map();
}

export async function getSession(prisma: PrismaClient, sessionId: string): Promise<RAGSession | null> {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && Date.now() < cached.expiry) {
    return cached.session;
  }
  
  // Remove expired cache entry
  if (cached) {
    sessionCache.delete(sessionId);
  }
  
  // Query database
  const session = await prisma.rAGSession.findUnique({
    where: { sessionId }
  });
  
  if (!session) {
    return null;
  }
  
  // Check if expired
  if (session.expiresAt < new Date()) {
    await prisma.rAGSession.delete({
      where: { sessionId }
    });
    return null;
  }
  
  // Cache the session
  sessionCache.set(sessionId, {
    session: {
      sessionId: session.sessionId,
      walletAddress: session.walletAddress,
      tier: session.tier,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      documentCount: session.documentCount,
      bytesUploaded: session.bytesUploaded
    },
    expiry: Date.now() + CACHE_DURATION_MS
  });
  
  return {
    sessionId: session.sessionId,
    walletAddress: session.walletAddress,
    tier: session.tier,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastActivityAt: session.lastActivityAt,
    documentCount: session.documentCount,
    bytesUploaded: session.bytesUploaded
  };
}

export async function updateSessionActivity(prisma: PrismaClient, sessionId: string, bytesAdded: number = 0): Promise<void> {
  // Update database
  await prisma.rAGSession.update({
    where: { sessionId },
    data: {
      lastActivityAt: new Date(),
      bytesUploaded: {
        increment: bytesAdded
      },
      documentCount: {
        increment: 1
      }
    }
  });
  
  // Update cache if exists
  const cached = sessionCache.get(sessionId);
  if (cached) {
    cached.session.lastActivityAt = new Date();
    cached.session.bytesUploaded += bytesAdded;
    cached.session.documentCount++;
  }
}

export async function cleanupExpiredSessions(prisma: PrismaClient): Promise<number> {
  const result = await prisma.rAGSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  
  // Clear cache entries for deleted sessions
  // Note: In a production system with multiple instances, 
  // you'd want to use Redis pub/sub or similar to sync cache invalidation
  // For now, we'll rely on cache expiration
  
  return result.count;
}

export function createSessionRoutes(prisma: PrismaClient, logger: any): any {
  const router = require('express').Router();

export function createSessionRoutes(prisma: any, logger: any): any {
  const router = require('express').Router();

  router.post('/start', async (req: Request, res: Response) => {
    try {
      const { wallet, signature, tier } = req.body;

      if (!wallet || !signature) {
        return res.status(400).json({ 
          error: 'Wallet address and signature required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const normalizedWallet = wallet.toLowerCase();

      const challengeMessage = `TAIS RAG Session Authorization\n\nWallet: ${wallet}\nTimestamp: ${Date.now()}\n\nAuthorize this session for encrypted document uploads.\n\nSession will be valid for 1 hour.`;

      const verification = verifySignature(challengeMessage, signature, wallet);
      if (!verification.valid) {
        return res.status(401).json({ 
          error: 'Invalid signature',
          code: 'INVALID_SIGNATURE'
        });
      }

      let userSessions = 0;
      sessions.forEach((s) => {
        if (s.walletAddress === normalizedWallet) userSessions++;
      });

      if (userSessions >= MAX_SESSIONS_PER_WALLET) {
        sessions.forEach((session, sessionId) => {
          if (session.walletAddress === normalizedWallet) {
            sessions.delete(sessionId);
            logger.info(`[RAG Session] Evicted old session ${sessionId} for ${wallet}`);
          }
        });
      }

      const sessionId = generateSessionId();
      const now = new Date();
      const session: RAGSession = {
        sessionId,
        walletAddress: normalizedWallet,
        tier: tier || 'bronze',
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
        lastActivityAt: now,
        documentCount: 0,
        bytesUploaded: 0,
      };

      sessions.set(sessionId, session);

      logger.info(`[RAG Session] Started session ${sessionId} for ${wallet}`);

      res.json({
        success: true,
        sessionId,
        walletAddress: wallet,
        tier: session.tier,
        expiresAt: session.expiresAt.toISOString(),
        expiresIn: SESSION_DURATION_MS / 1000,
        maxDocuments: 1000,
        maxStorage: 100 * 1024 * 1024 * 1024, // 100GB for gold
      });
    } catch (error) {
      logger.error('Error starting RAG session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  });

   router.get('/status', async (req: Request, res: Response) => {
     try {
       const sessionToken = req.headers['x-session-token'] as string;

       if (!sessionToken) {
         return res.status(401).json({ error: 'Session token required' });
       }

       const session = await getSession(prisma, sessionToken);
       if (!session) {
         return res.status(401).json({ 
           error: 'Invalid or expired session',
           code: 'SESSION_EXPIRED'
         });
       }

       const remainingMs = session.expiresAt.getTime() - Date.now();

       res.json({
         valid: true,
         walletAddress: session.walletAddress,
         tier: session.tier,
         createdAt: session.createdAt.toISOString(),
         expiresAt: session.expiresAt.toISOString(),
         expiresIn: Math.max(0, Math.floor(remainingMs / 1000)),
         documentCount: session.documentCount,
         bytesUploaded: session.bytesUploaded,
         lastActivityAt: session.lastActivityAt.toISOString(),
       });
     } catch (error) {
       logger.error('Error checking session status:', error);
       res.status(500).json({ error: 'Failed to check session' });
     }
   });

   router.delete('/end', async (req: Request, res: Response) => {
     try {
       const sessionToken = req.headers['x-session-token'] as string;

       if (!sessionToken) {
         return res.status(400).json({ error: 'Session token required' });
       }

       const session = await getSession(prisma, sessionToken);
       if (session) {
         logger.info(`[RAG Session] Ended session ${sessionToken} for ${session.walletAddress}`);
         await prisma.rAGSession.delete({
           where: { sessionId: sessionToken }
         });
         // Also remove from cache
         sessionCache.delete(sessionToken);
       }

       res.json({ success: true, message: 'Session ended' });
     } catch (error) {
       logger.error('Error ending session:', error);
       res.status(500).json({ error: 'Failed to end session' });
     }
   });

  return router;
}

export function sessionAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.headers['x-session-token'] as string;
  const walletFromBody = req.body?.wallet;

  if (!sessionToken) {
    return next();
  }

  const session = getSession(sessionToken);
  if (!session) {
    return res.status(401).json({ 
      error: 'Invalid or expired session. Start a new session with POST /api/v1/rag/session/start',
      code: 'SESSION_EXPIRED'
    });
  }

  if (walletFromBody && walletFromBody.toLowerCase() !== session.walletAddress) {
    return res.status(403).json({ 
      error: 'Session wallet mismatch',
      code: 'WALLET_MISMATCH'
    });
  }

   req.session = session;
   req.wallet = session.walletAddress;

  updateSessionActivity(sessionToken);

  next();
}

export function requireSessionOrWallet(req: Request, res: Response, next: NextFunction) {
  const session = ('session' in req && req.session !== undefined) ? req.session as RAGSession | undefined : undefined;
  const wallet = req.body?.wallet || req.query?.wallet;

  if (!session && !wallet) {
    return res.status(401).json({ 
      error: 'Authentication required. Provide either a session token or wallet address.',
      code: 'AUTH_REQUIRED'
    });
  }

  next();
}
