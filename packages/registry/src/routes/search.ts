import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

// Extend Express Request type to include our custom properties
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

// GET /api/search - Search skills
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if prisma is available
  if (!req.prisma) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  
  try {
    const { query, limit, offset } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Public, unauthenticated endpoint -- cap take like every other list
    // route in this codebase (agent.ts, audits.ts, rag.ts, rcrt.ts all use
    // the same Math.min(..., 100) pattern), or an attacker-supplied limit
    // forces an unbounded findMany + join + count aggregate in one request.
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string) || 0;
    
    const skills = await req.prisma.skill.findMany({
      where: {
        status: 'APPROVED',
        isBlocked: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limitNum,
      skip: offsetNum,
      orderBy: [
        { trustScore: 'desc' },
        { downloadCount: 'desc' }
      ],
      include: {
        categories: { include: { category: true } },
        _count: { select: { audits: true } }
      }
    });
    
    res.json({
      query,
      results: skills.length,
      skills
    });
  } catch (error) {
    req.log?.error({ error }, 'Search failed');
    next(error);
  }
});

export { router as searchRoutes };