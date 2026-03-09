import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  walletAddress?: string;
  appId?: string;
}

export function createKBRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.post('/register', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.walletAddress;
      const { kbId, appId, contextType = 'public', excludeFromRCRT = false } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!kbId) {
        return res.status(400).json({ error: 'KB ID required' });
      }

      await prisma.$executeRaw`
        INSERT INTO "KBRegistry" ("kbId", "ownerId", "appId", "contextType", "excludedFromRCRT", "attachedAt")
        VALUES (${kbId}, ${walletAddress}, ${appId}, ${contextType}, ${excludeFromRCRT}, NOW())
        ON CONFLICT ("kbId") DO UPDATE SET 
          "contextType" = ${contextType},
          "excludedFromRCRT" = ${excludeFromRCRT},
          "attachedAt" = NOW()
      `;

      logger.info(`KB ${kbId} registered with context type ${contextType}`);

      res.json({
        success: true,
        kbId,
        contextType,
        excludedFromRCRT: excludeFromRCRT
      });
    } catch (error: any) {
      logger.error('Error registering KB:', error);
      res.status(500).json({ error: 'Failed to register KB' });
    }
  });

  router.get('/registry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const kbs = await prisma.$queryRaw<any[]>`
        SELECT * FROM "KBRegistry"
        WHERE "ownerId" = ${walletAddress}
        ORDER BY "attachedAt" DESC
      `;

      res.json({ kbRegistries: kbs });
    } catch (error: any) {
      logger.error('Error getting KB registries:', error);
      res.status(500).json({ error: 'Failed to get KB registries' });
    }
  });

  router.patch('/:kbId/context-type', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.walletAddress;
      const { kbId } = req.params;
      const { contextType } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validTypes = ['private', 'confidential', 'shared', 'public'];
      if (!validTypes.includes(contextType)) {
        return res.status(400).json({ error: 'Invalid context type' });
      }

      await prisma.$executeRaw`
        UPDATE "KBRegistry"
        SET "contextType" = ${contextType}
        WHERE "kbId" = ${kbId}
        AND "ownerId" = ${walletAddress}
      `;

      res.json({ success: true, kbId, contextType });
    } catch (error: any) {
      logger.error('Error updating context type:', error);
      res.status(500).json({ error: 'Failed to update context type' });
    }
  });

  router.post('/:kbId/exclude-rcrt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.walletAddress;
      const { kbId } = req.params;
      const { exclude = true } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await prisma.$executeRaw`
        UPDATE "KBRegistry"
        SET "excludedFromRCRT" = ${exclude}
        WHERE "kbId" = ${kbId}
        AND "ownerId" = ${walletAddress}
      `;

      res.json({ success: true, kbId, excludedFromRCRT: exclude });
    } catch (error: any) {
      logger.error('Error updating RCRT exclusion:', error);
      res.status(500).json({ error: 'Failed to update RCRT exclusion' });
    }
  });

  router.get('/:kbId/access', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.walletAddress;
      const { kbId } = req.params;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const history = await prisma.$queryRaw<any[]>`
        SELECT * FROM "KBAccessHistory"
        WHERE "kbId" = ${kbId}
        ORDER BY "grantedAt" DESC
      `;

      res.json({ accessHistory: history });
    } catch (error: any) {
      logger.error('Error getting access history:', error);
      res.status(500).json({ error: 'Failed to get access history' });
    }
  });

  return router;
}
