import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminActionSchema, validateInput, sanitizeValidationErrors } from '../validation/schemas';
import { requireAdmin } from '../middleware/admin';

/**
 * Admin Routes - Squad ETA
 * Fixed: CRIT-1 - Input validation on all admin endpoints
 * Fixed: MED-2 - Structured error logging
 */

const router = Router();

// GET /api/admin/stats - Get platform statistics (admin only)
router.get('/stats', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  
  try {
    // Squad ETA Fix: Add structured logging
    req.log.info({
      admin: req.user?.walletAddress,
      action: 'view_stats'
    }, 'Admin viewing platform statistics');
    
    const [
      totalSkills,
      pendingSkills,
      blockedSkills,
      totalAudits,
      maliciousAudits
    ] = await Promise.all([
      prisma.skill.count(),
      prisma.skill.count({ where: { status: 'PENDING' } }),
      prisma.skill.count({ where: { isBlocked: true } }),
      prisma.audit.count(),
      prisma.audit.count({ where: { status: 'MALICIOUS' } })
    ]);
    
    res.json({
      skills: {
        total: totalSkills,
        pending: pendingSkills,
        blocked: blockedSkills
      },
      audits: {
        total: totalAudits,
        malicious: maliciousAudits
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Squad ETA Fix: MED-2 - Structured error logging
    req.log.error({
      error,
      admin: req.user?.walletAddress,
      action: 'view_stats'
    }, 'Failed to fetch admin stats');
    
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/admin/skills/:id/block - Block a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/block', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input using Zod
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      ...req.body
    });
    
    if (!validation.success) {
      req.log.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin block request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    // Squad ETA Fix: Validate skill exists
    const skill = await prisma.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    // Squad ETA Fix: Check if already blocked
    if (skill.isBlocked) {
      return res.status(409).json({ error: 'Skill is already blocked' });
    }
    
    // Block the skill
    const updatedSkill = await prisma.skill.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason // Now validated and safe
      }
    });
    
    // Squad ETA Fix: Structured logging
    req.log.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill.name,
      reason
    }, 'Skill blocked by admin');
    
    res.json({
      message: 'Skill blocked successfully',
      skill: updatedSkill
    });
  } catch (error) {
    // Squad ETA Fix: MED-2 - Structured error logging
    req.log.error({
      error,
      admin: req.user?.walletAddress,
      action: 'block_skill',
      skillId: id
    }, 'Failed to block skill');
    
    res.status(500).json({ error: 'Failed to block skill' });
  }
});

// POST /api/admin/skills/:id/unblock - Unblock a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/unblock', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      action: 'unblock',
      ...req.body
    });
    
    if (!validation.success) {
      req.log.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin unblock request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    const skill = await prisma.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    if (!skill.isBlocked) {
      return res.status(409).json({ error: 'Skill is not blocked' });
    }
    
    const updatedSkill = await prisma.skill.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null
      }
    });
    
    req.log.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill.name,
      reason
    }, 'Skill unblocked by admin');
    
    res.json({
      message: 'Skill unblocked successfully',
      skill: updatedSkill
    });
  } catch (error) {
    req.log.error({
      error,
      admin: req.user?.walletAddress,
      action: 'unblock_skill',
      skillId: id
    }, 'Failed to unblock skill');
    
    res.status(500).json({ error: 'Failed to unblock skill' });
  }
});

// POST /api/admin/skills/:id/verify - Manually verify a skill (admin only)
// Squad ETA Fix: CRIT-1 - Input validation
router.post('/skills/:id/verify', async (req: any, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  
  try {
    // Squad ETA Fix: CRIT-1 - Validate input
    const validation = validateInput(adminActionSchema, {
      skillId: id,
      action: 'verify',
      ...req.body
    });
    
    if (!validation.success) {
      req.log.warn({
        admin: req.user?.walletAddress,
        skillId: id,
        errors: validation.errors
      }, 'Invalid admin verify request');
      
      return res.status(400).json({
        error: 'Validation failed',
        details: sanitizeValidationErrors(validation.errors)
      });
    }
    
    const { reason } = validation.data;
    
    const skill = await prisma.skill.findUnique({
      where: { id }
    });
    
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    if (skill.status === 'APPROVED') {
      return res.status(409).json({ error: 'Skill is already verified' });
    }
    
    const updatedSkill = await prisma.skill.update({
      where: { id },
      data: {
        status: 'APPROVED',
        blockedReason: reason
      }
    });
    
    req.log.info({
      admin: req.user?.walletAddress,
      skillId: id,
      skillName: skill.name,
      reason
    }, 'Skill verified by admin');
    
    res.json({
      message: 'Skill verified successfully',
      skill: updatedSkill
    });
  } catch (error) {
    req.log.error({
      error,
      admin: req.user?.walletAddress,
      action: 'verify_skill',
      skillId: id
    }, 'Failed to verify skill');
    
    res.status(500).json({ error: 'Failed to verify skill' });
  }
});

export { router as adminRoutes };
