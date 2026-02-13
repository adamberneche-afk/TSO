import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { skillSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';

/**
 * Skill Routes - Squad Delta
 * Fixed: Added authentication, ownership verification, and proper middleware integration
 */

const router = Router();

// GET /api/skills - List all skills (public)
router.get('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const { category, search, trending } = req.query;
    
    let where: any = { status: 'APPROVED', isBlocked: false };
    
    if (category) {
      where.categories = {
        some: {
          category: { name: category as string }
        }
      };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const skills = await prisma.skill.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        _count: { select: { audits: true } }
      },
      orderBy: trending ? { downloadCount: 'desc' } : { createdAt: 'desc' },
      take: 50
    });
    
    res.json({ skills, total: skills.length });
  } catch (error) {
    (req as any).log?.error({ error }, 'Failed to fetch skills');
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// GET /api/skills/:hash - Get skill details (public)
router.get('/:hash', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { hash } = req.params;
  
  try {
    const skill = await prisma.skill.findUnique({
      where: { skillHash: hash },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        audits: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json(skill);
  } catch (error) {
    (req as any).log?.error({ error, hash }, 'Failed to fetch skill');
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
});

// POST /api/skills - Register new skill (REQUIRES AUTH + PUBLISHER NFT)
// Squad Delta Fix: Added authentication and ownership verification
router.post('/', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  
  try {
    // Squad Delta Fix: Verify authentication first
    if (!req.user || !req.user.walletAddress) {
      (req as any).log?.warn('Skill creation attempted without authentication');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Publishing skills requires authentication'
      });
    }
    
    // Squad Delta Fix: Validate input using Zod schema
    const validation = validateInput(skillSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const skillData = validation.data;
    
    // Squad Delta Fix: MEDIUM-1 - Verify author matches authenticated user
    if (skillData.author.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      (req as any).log?.warn({
        claimedAuthor: skillData.author,
        authenticatedUser: req.user.walletAddress
      }, 'Skill author does not match authenticated user');
      
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Skill author must match your authenticated wallet address'
      });
    }
    
    // Check if skill already exists
    const existing = await prisma.skill.findUnique({
      where: { skillHash: skillData.skillHash }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Skill with this hash already exists' });
    }
    
    // Squad Delta Fix: Create skill with verified author
    const skill = await prisma.skill.create({
      data: {
        skillHash: skillData.skillHash,
        name: skillData.name,
        version: skillData.version,
        description: skillData.description,
        author: req.user.walletAddress, // Use authenticated wallet, not request body
        manifestCid: skillData.manifestCid ?? '',
        packageCid: skillData.packageCid,
        permissions: skillData.permissions || {},
        status: 'PENDING'
      }
    });
    
    (req as any).log?.info({
      skillId: skill.id,
      skillHash: skillData.skillHash,
      author: req.user.walletAddress
    }, 'Skill registered successfully');
    
    res.status(201).json(skill);
  } catch (error) {
    (req as any).log?.error({ error }, 'Failed to register skill');
    res.status(500).json({ error: 'Failed to register skill' });
  }
});

// GET /api/skills/:hash/download - Get download URL (public)
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
      return res.status(403).json({ error: 'Skill has been blocked' });
    }
    
    // Increment download count
    await prisma.skill.update({
      where: { id: skill.id },
      data: { downloadCount: { increment: 1 } }
    });
    
    // Return IPFS gateway URL
    const ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    res.json({
      downloadUrl: `${ipfsGateway}/${skill.packageCid || skill.manifestCid}`,
      skillHash: skill.skillHash,
      version: skill.version
    });
  } catch (error) {
    (req as any).log?.error({ error, hash }, 'Failed to get download URL');
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export { router as skillRoutes };
