import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Admin authentication middleware
const requireAdmin = (req: any, res: any, next: any) => {
  const adminWallets = process.env.ADMIN_WALLET_ADDRESSES?.split(',') || [];
  const userWallet = req.headers['x-wallet-address'];
  
  if (!userWallet || !adminWallets.includes(userWallet as string)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get admin stats
router.get('/stats', requireAdmin, async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const stats = await prisma.$transaction([
      prisma.skill.count(),
      prisma.audit.count(),
      prisma.skill.count({ where: { isBlocked: true } }),
      prisma.skill.count({ where: { status: 'PENDING' } }),
    ]);
    
    res.json({
      totalSkills: stats[0],
      totalAudits: stats[1],
      blockedSkills: stats[2],
      pendingApprovals: stats[3],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Block a skill
router.post('/skills/:id/block', requireAdmin, async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    const skill = await prisma.skill.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: reason,
        status: 'SUSPENDED',
      },
    });
    res.json({ message: 'Skill blocked', skill });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block skill' });
  }
});

// Unblock a skill
router.post('/skills/:id/unblock', requireAdmin, async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  const { id } = req.params;
  
  try {
    const skill = await prisma.skill.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
        status: 'APPROVED',
      },
    });
    res.json({ message: 'Skill unblocked', skill });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock skill' });
  }
});

// List blocked skills
router.get('/skills/blocked', requireAdmin, async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const skills = await prisma.skill.findMany({
      where: { isBlocked: true },
      orderBy: { blockedAt: 'desc' },
    });
    res.json({ skills, total: skills.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked skills' });
  }
});

export { router as adminRoutes };
