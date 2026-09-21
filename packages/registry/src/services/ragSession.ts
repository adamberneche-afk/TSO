import { Request, Response, NextFunction, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifySignature } from '../utils/signature';
import crypto from 'crypto';

// Extend Express Request type to include our custom properties
interface AuthenticatedRequest extends Request {
  session?: {
    sessionId: string;
    walletAddress: string;
    tier: string;
    createdAt: Date;
    expiresAt: Date;
    lastActivityAt: Date;
    documentCount: number;
    bytesUploaded: bigint;
  };
  wallet?: string;
}

interface RAGSession {
  sessionId: string;
  walletAddress: string;
  tier: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  documentCount: number;
  bytesUploaded: bigint;
}

// Database-backed session storage instead of in-memory Map
// This provides persistence and scalability across multiple instances

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS_PER_WALLET = 3;
const SESSION_CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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
  
  return session;
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
    cached.session.bytesUploaded += BigInt(bytesAdded);
    cached.session.documentCount++;
  }
}

export async function endSession(prisma: PrismaClient, sessionId: string): Promise<void> {
  await prisma.rAGSession.delete({
    where: { sessionId }
  });
  // Also remove from cache
  sessionCache.delete(sessionId);
}

export async function getActiveSession(prisma: PrismaClient, walletAddress: string): Promise<RAGSession | null> {
  const sessions = await prisma.rAGSession.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: { gt: new Date() } // not expired
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  });

  return sessions[0] || null;
}

export async function startSession(prisma: PrismaClient, walletAddress: string): Promise<string> {
  // Get active sessions for this wallet
  const activeSessions = await prisma.rAGSession.findMany({
    where: {
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: { gt: new Date() }
    },
    orderBy: {
      createdAt: 'asc' // oldest first
    }
  });

  // If we have reached the limit, remove the oldest session(s)
  if (activeSessions.length >= MAX_SESSIONS_PER_WALLET) {
    const sessionsToRemove = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS_PER_WALLET + 1);
    for (const session of sessionsToRemove) {
      await prisma.rAGSession.delete({
        where: { sessionId: session.sessionId }
      });
      // Also remove from cache
      sessionCache.delete(session.sessionId);
    }
  }

  // Create new session
  const sessionId = generateSessionId();
  const now = new Date();
  const session: RAGSession = {
    sessionId,
    walletAddress: walletAddress.toLowerCase(),
    tier: 'bronze', // default tier, can be updated later based on stake
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    lastActivityAt: now,
    documentCount: 0,
    bytesUploaded: BigInt(0)
  };

  await prisma.rAGSession.create({
    data: session
  });

  // Cache the session
  sessionCache.set(sessionId, {
    session,
    expiry: Date.now() + CACHE_DURATION_MS
  });

  return sessionId;
}

export function sessionAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
   const sessionToken = req.headers['x-session-token'] as string;
   const walletFromBody = req.body?.wallet;

  if (!sessionToken) {
    return next();
  }

  // Note: We are making the middleware async by returning a promise
  // We'll handle the async work in a separate function and then call next()
  (async () => {
    try {
      // We need to get the prisma client from somewhere
      // In the request logging middleware, we set req.prisma
      // But we don't have access to req here in the async function unless we pass it
      // Let's change the approach: we'll get the prisma client from a global or from a service locator
      // For now, we'll create a new PrismaClient instance (not ideal for production but works for now)
      const prisma = new PrismaClient();
      
      const session = await getSession(prisma, sessionToken);
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

      await updateSessionActivity(prisma, session.sessionId, 0);
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error in session auth middleware:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    next();
  })();
}

/**
 * Create session routes
 */
export function createSessionRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();

  router.post('/start', async (req: Request, res: Response) => {
    try {
      // The real client (rag-sdk's startRAGSession) sends { wallet,
      // signature }, not { walletAddress } -- and it signs a real
      // challenge before calling this, expecting the signature to
      // actually be checked. `verifySignature` has been imported at the
      // top of this file since this route was written, but was never
      // called: anyone could mint a session token for any wallet with no
      // proof of ownership at all, just by naming that wallet.
      const { wallet, signature, timestamp } = req.body;
      if (!wallet || !signature || !timestamp) {
        return res.status(400).json({ error: 'wallet, signature, and timestamp are required' });
      }

      // The challenge embeds the timestamp used to sign it, so it must be
      // reconstructed with that exact value -- never a fresh Date.now() --
      // and bounded so a captured signature can't be replayed forever.
      if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > SESSION_CHALLENGE_EXPIRY_MS) {
        return res.status(401).json({ error: 'Signature challenge has expired' });
      }

      const challenge = `TAIS RAG Session Authorization\n\nWallet: ${wallet}\nTimestamp: ${timestamp}\n\nAuthorize this session for encrypted document uploads.\n\nSession will be valid for 1 hour.`;
      const verification = verifySignature(challenge, signature, wallet);
      if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const sessionId = await startSession(prisma, wallet);
      // rag-sdk checks `result.success && result.sessionId` before storing
      // the token client-side -- without `success`, a legitimate response
      // was silently treated as a failed request and the token was
      // dropped on the floor every time.
      res.json({ success: true, sessionId });
    } catch (error) {
      logger.error('Error starting session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  });

  router.post('/end', async (req: Request, res: Response) => {
    try {
      const sessionToken = req.headers['x-session-token'] as string;
      if (!sessionToken) {
        return res.status(401).json({ error: 'Session token is required' });
      }

      await endSession(prisma, sessionToken);
      res.json({ success: true, message: 'Session ended' });
    } catch (error) {
      logger.error('Error ending session:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

    router.get('/active', async (req: Request, res: Response) => {
     try {
       let walletAddress: string | undefined = req.query.walletAddress as string | undefined;
       
       if (Array.isArray(walletAddress)) {
         walletAddress = walletAddress[0];
       }
       
       if (!walletAddress) {
         return res.status(400).json({ error: 'Wallet address is required' });
       }

      const session = await getActiveSession(prisma, walletAddress);
      if (!session) {
        return res.status(404).json({ error: 'No active session found' });
      }

      // This endpoint takes nothing but a bare wallet address -- no proof
      // of ownership -- so it must never hand back session.sessionId: that
      // value *is* the bearer credential accepted as X-Session-Token
      // everywhere else in this file. Returning it here let anyone who
      // just knew (or guessed/observed on-chain) a wallet address fetch
      // its live session token and replay it to act as that wallet.
      res.json({
        walletAddress: session.walletAddress,
        tier: session.tier,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        documentCount: session.documentCount,
        // bytesUploaded is a Postgres BigInt -> native JS bigint; res.json's
        // JSON.stringify throws "Do not know how to serialize a BigInt" on
        // a raw bigint. A per-wallet upload byte count is nowhere near
        // Number.MAX_SAFE_INTEGER, so converting is safe.
        bytesUploaded: Number(session.bytesUploaded)
      });
    } catch (error) {
      logger.error('Error getting active session:', error);
      res.status(500).json({ error: 'Failed to get active session' });
    }
  });

  return router;
}