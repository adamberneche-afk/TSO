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
    
    const limitNum = parseInt(limit as string) || 20;
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