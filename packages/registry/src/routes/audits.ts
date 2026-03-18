import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';

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

// GET /api/audits - List recent audits (public)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [audits, total] = await Promise.all([
      req.prisma.audit.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              skillHash: true,
              creatorWallet: true,
            }
          }
        }
      }),
      req.prisma.audit.count(),
    ]);

    res.json({
      audits: audits.map(audit => ({
        id: audit.id,
        skill: {
          id: audit.skill.id,
          name: audit.skill.name,
          skillHash: audit.skill.skillHash,
          creatorWallet: audit.skill.creatorWallet,
        },
        action: audit.action,
        status: audit.status,
        reporter: audit.reporter,
        timestamp: audit.createdAt,
        details: audit.details,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    req.log?.error({ error }, 'Failed to fetch audits');
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// GET /api/audits/:skillHash - Get audits for a specific skill
router.get('/:skillHash', async (req: AuthenticatedRequest, res: Response) => {
  const { skillHash } = req.params;
  try {
    const skill = await req.prisma.skill.findUnique({
      where: { skillHash },
      select: {
        id: true,
        name: true,
        skillHash: true,
        creatorWallet: true,
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            action: true,
            status: true,
            reporter: true,
            createdAt: true,
            details: true,
          }
        }
      }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({
      skill: {
        id: skill.id,
        name: skill.name,
        skillHash: skill.skillHash,
        creatorWallet: skill.skillCreatorWallet,
      },
      audits: skill.audits.map(audit => ({
        id: audit.id,
        action: audit.action,
        status: audit.status,
        reporter: audit.reporter,
        timestamp: audit.createdAt,
        details: audit.details,
      })),
    });
  } catch (error) {
    req.log?.error({ error, skillHash }, 'Failed to fetch skill audits');
    res.status(500).json({ error: 'Failed to fetch skill audits' });
  }
});

export { router as auditRoutes };