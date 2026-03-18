import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  prisma?: PrismaClient;
}

const router = Router();

// GET /api/search - Search skills
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  
  try {
    const query = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 20;
    
    const skills = await prisma.skill.findMany({
      where: {
        status: 'APPROVED',
        isBlocked: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
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
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/search/categories - Get all categories
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { skills: true } }
      }
    });
    
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/search/trending - Get trending skills
router.get('/trending', async (req: AuthenticatedRequest, res: Response) => {
  
  try {
    const skills = await prisma.skill.findMany({
      where: {
        status: 'APPROVED',
        isBlocked: false
      },
      take: 10,
      orderBy: [
        { downloadCount: 'desc' }
      ],
      select: {
        name: true,
        skillHash: true,
        downloadCount: true,
        trustScore: true
      }
    });
    
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending skills' });
  }
});

export { router as searchRoutes };