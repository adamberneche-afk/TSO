import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  walletAddress?: string;
  appId?: string;
}

export function createKBRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Simple test endpoint
  router.get('/test', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post('/register', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      const { kbId, appId, contextType = 'public', excludeFromRCRT = false } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!kbId) {
        return res.status(400).json({ error: 'KB ID required' });
      }

      // Simplified - just return success for now (db issues)
      res.json({ success: true, kbId, contextType });
    } catch (error: any) {
      logger.error('Error registering KB:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/registry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Simplified - return empty array for now
      res.json({ kbRegistries: [] });
    } catch (error: any) {
      logger.error('Error getting KB registries:', error);
      res.status(500).json({ error: 'Failed to get KB registries' });
    }
  });

  router.patch('/:kbId/context-type', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      const { kbId } = req.params;
      const { contextType } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validTypes = ['private', 'confidential', 'shared', 'public'];
      if (!validTypes.includes(contextType)) {
        return res.status(400).json({ error: 'Invalid context type' });
      }

      res.json({ success: true, kbId, contextType });
    } catch (error: any) {
      logger.error('Error updating context type:', error);
      res.status(500).json({ error: 'Failed to update context type' });
    }
  });

  router.post('/:kbId/exclude-rcrt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      const { kbId } = req.params;
      const { exclude = true } = req.body;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json({ success: true, kbId, excludedFromRCRT: exclude });
    } catch (error: any) {
      logger.error('Error updating RCRT exclusion:', error);
      res.status(500).json({ error: 'Failed to update RCRT exclusion' });
    }
  });

  router.get('/:kbId/access', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      const { kbId } = req.params;

      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json({ accessHistory: [] });
    } catch (error: any) {
      logger.error('Error getting access history:', error);
      res.status(500).json({ error: 'Failed to get access history' });
    }
  });

  return router;
}
