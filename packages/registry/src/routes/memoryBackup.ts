import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export function createMemoryBackupRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();

  // Sync memories to cloud (backup)
  router.post('/backup', async (req: Request, res: Response) => {
    try {
      const { wallet, memories } = req.body;

      if (!wallet || !memories || !Array.isArray(memories)) {
        return res.status(400).json({ error: 'Wallet and memories array required' });
      }

      // Upsert all memories (create or update)
      for (const memory of memories) {
        await prisma.cTOInsight.upsert({
          where: { id: memory.memoryId || `backup_${Date.now()}_${Math.random()}` },
          create: {
            id: memory.memoryId || `backup_${Date.now()}_${Math.random()}`,
            walletAddress: wallet,
            title: memory.sessionSummary?.conversationSummary?.substring(0, 100) || 'Backup',
            content: JSON.stringify(memory),
            category: 'lessons-learned',
            status: 'draft',
            upvotes: 0,
          },
          update: {
            content: JSON.stringify(memory),
          },
        });
      }

      logger.info(`[Memory] Backed up ${memories.length} memories for ${wallet}`);

      res.json({ success: true, backedUp: memories.length });
    } catch (error) {
      logger.error('Error backing up memories:', error);
      res.status(500).json({ error: 'Failed to backup memories' });
    }
  });

  // Restore memories from cloud
  router.get('/restore', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const backups = await prisma.cTOInsight.findMany({
        where: {
          walletAddress: wallet,
          category: 'lessons-learned',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const memories = backups.map(b => {
        try {
          return JSON.parse(b.content);
        } catch {
          return { memoryId: b.id, content: b.content };
        }
      });

      logger.info(`[Memory] Restored ${memories.length} memories for ${wallet}`);

      res.json({ memories });
    } catch (error) {
      logger.error('Error restoring memories:', error);
      res.status(500).json({ error: 'Failed to restore memories' });
    }
  });

  // Get backup status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const count = await prisma.cTOInsight.count({
        where: {
          walletAddress: wallet,
          category: 'lessons-learned',
        },
      });

      res.json({ backedUp: count, lastBackup: null });
    } catch (error) {
      logger.error('Error getting backup status:', error);
      res.status(500).json({ error: 'Failed to get backup status' });
    }
  });

  return router;
}

export default createMemoryBackupRoutes;
