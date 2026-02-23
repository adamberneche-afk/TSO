import { Request, Response, NextFunction } from 'express';
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

const sessions = new Map<string, RAGSession>();
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS_PER_WALLET = 3;

function generateSessionId(): string {
  return 'rag_sess_' + crypto.randomBytes(32).toString('hex');
}

export function getActiveSessions(): Map<string, RAGSession> {
  return sessions;
}

export function getSession(sessionId: string): RAGSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  if (session.expiresAt < new Date()) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

export function updateSessionActivity(sessionId: string, bytesAdded: number = 0): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  session.lastActivityAt = new Date();
  session.bytesUploaded += bytesAdded;
  session.documentCount++;
}

export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;
  
  sessions.forEach((session, sessionId) => {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
      cleaned++;
    }
  });
  
  return cleaned;
}

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

      const session = getSession(sessionToken);
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

      const session = sessions.get(sessionToken);
      if (session) {
        logger.info(`[RAG Session] Ended session ${sessionToken} for ${session.walletAddress}`);
        sessions.delete(sessionToken);
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

  (req as any).session = session;
  (req as any).wallet = session.walletAddress;

  updateSessionActivity(sessionToken);

  next();
}

export function requireSessionOrWallet(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const wallet = req.body?.wallet || req.query?.wallet;

  if (!session && !wallet) {
    return res.status(401).json({ 
      error: 'Authentication required. Provide either a session token or wallet address.',
      code: 'AUTH_REQUIRED'
    });
  }

  next();
}
