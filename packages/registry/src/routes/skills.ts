import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Validation schemas
const skillSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  minTrustScore: z.coerce.number().min(0).max(1).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z.coerce.number().max(100).default(20),
  offset: z.coerce.number().default(0)
});

// GET /api/skills - List all skills
router.get('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const filters = skillSearchSchema.parse(req.query);
    
    const where: any = {
      status: filters.status || 'APPROVED',
      isBlocked: false
    };
    
    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } }
      ];
    }
    
    if (filters.author) {
      where.author = filters.author;
    }
    
    if (filters.minTrustScore !== undefined) {
      where.trustScore = { gte: filters.minTrustScore };
    }
    
    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        take: filters.limit,
        skip: filters.offset,
        orderBy: { trustScore: 'desc' },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          _count: { select: { audits: true } }
        }
      }),
      prisma.skill.count({ where })
    ]);
    
    res.json({
      skills,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: total > filters.offset + filters.limit
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to fetch skills' });
    }
  }
});

// GET /api/skills/:hash - Get skill by hash
router.get('/:hash', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { hash } = req.params;
  
  try {
    const skill = await prisma.skill.findUnique({
      where: { skillHash: hash },
      include: {
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Increment download count
    await prisma.skill.update({
      where: { id: skill.id },
      data: { downloadCount: { increment: 1 } }
    });
    
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// POST /api/skills - Register new skill (requires auth)
router.post('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const skillData = req.body;
    
    // Validate required fields
    if (!skillData.skillHash || !skillData.name || !skillData.version || !skillData.author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if skill already exists
    const existing = await prisma.skill.findUnique({
      where: { skillHash: skillData.skillHash }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Skill with this hash already exists' });
    }
    
    // Create skill
    const skill = await prisma.skill.create({
      data: {
        skillHash: skillData.skillHash,
        name: skillData.name,
        version: skillData.version,
        description: skillData.description,
        author: skillData.author,
        manifestCid: skillData.manifestCid,
        packageCid: skillData.packageCid,
        permissions: skillData.permissions || {},
        status: 'PENDING'
      }
    });
    
    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register skill' });
  }
});

// GET /api/skills/:hash/download - Get download URL
router.get('/:hash/download', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { hash } = req.params;
  
  try {
    const skill = await prisma.skill.findUnique({
      where: { skillHash: hash }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    if (skill.isBlocked) {
      return res.status(403).json({ 
        error: 'Skill is blocked',
        reason: skill.blockedReason 
      });
    }
    
    // Return IPFS gateway URL or direct download
    const downloadUrl = skill.packageCid 
      ? `https://ipfs.io/ipfs/${skill.packageCid}`
      : null;
    
    res.json({
      skillHash: hash,
      manifestCid: skill.manifestCid,
      packageCid: skill.packageCid,
      downloadUrl,
      checksum: skill.skillHash
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

export { router as skillRoutes };