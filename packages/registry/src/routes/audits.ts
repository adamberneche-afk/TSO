import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/audits - List recent audits
router.get('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const audits = await prisma.audit.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        skill: {
          select: {
            name: true,
            skillHash: true,
            author: true
          }
        }
      }
    });
    
    res.json({ audits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// POST /api/audits - Submit new audit
router.post('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const auditData = req.body;
    
    // Find the skill
    const skill = await prisma.skill.findUnique({
      where: { skillHash: auditData.skillHash }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Create audit
    const audit = await prisma.audit.create({
      data: {
        skillId: skill.id,
        auditor: auditData.auditor,
        auditorNft: auditData.auditorNft,
        status: auditData.status,
        findings: auditData.findings || [],
        signature: auditData.signature
      }
    });
    
    // Update skill trust score if audit is malicious
    if (auditData.status === 'MALICIOUS') {
      await prisma.skill.update({
        where: { id: skill.id },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: 'Flagged as malicious by community audit'
        }
      });
    }
    
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit audit' });
  }
});

// GET /api/audits/:skillHash - Get audits for a skill
router.get('/skill/:skillHash', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { skillHash } = req.params;
  
  try {
    const skill = await prisma.skill.findUnique({
      where: { skillHash },
      include: {
        audits: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Calculate audit summary
    const summary = {
      total: skill.audits.length,
      safe: skill.audits.filter(a => a.status === 'SAFE').length,
      suspicious: skill.audits.filter(a => a.status === 'SUSPICIOUS').length,
      malicious: skill.audits.filter(a => a.status === 'MALICIOUS').length
    };
    
    res.json({
      skill: {
        name: skill.name,
        skillHash: skill.skillHash
      },
      summary,
      audits: skill.audits
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

export { router as auditRoutes };