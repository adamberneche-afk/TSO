import { Router, Request, Response } from 'express';
import { rcrtProvisionService } from '../services/rcrtProvisionService';
import { securityScannerService } from '../services/securityScannerService';
import { authenticateToken } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  walletAddress?: string;
  appId?: string;
  scopes?: string[];
}

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Test endpoint - no auth required
  router.get('/test', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Test endpoint 2 - no auth
  router.get('/test2', (req, res) => {
    res.json({ status: 'ok2' });
  });

  // Test endpoint with auth - no DB call
  router.get('/test-auth', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ status: 'ok', wallet: req.user?.walletAddress });
  });

  // Provision new RCRT agent
  router.post('/provision', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      
      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const provision = await rcrtProvisionService.provisionRCRT(walletAddress);
      
      logger.info(`RCRT provisioned for user ${walletAddress}`);
      
      res.json({
        agentId: provision.agentId,
        token: provision.token,
        refreshToken: provision.refreshToken,
        expiresAt: provision.expiresAt,
        expiresIn: 900 // 15 minutes in seconds
      });
    } catch (error: any) {
      logger.error('Error provisioning RCRT:', error);
      res.status(500).json({ error: error.message || 'Failed to provision RCRT' });
    }
  });

  // Get RCRT status - no auth for testing
  router.get('/rcrt-status', (req, res) => {
    res.json({ provisioned: false });
  });

  // Simple status2
  router.get('/status2', (req, res) => {
    res.json({ test: 'ok' });
  });

  // Revoke RCRT access
  router.delete('/provision', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.user?.walletAddress;
      const { agentId } = req.body;
      
      if (!walletAddress) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID required' });
      }

      await rcrtProvisionService.revokeProvision(agentId);
      
      logger.info(`RCRT revoked for user ${walletAddress}, agent ${agentId}`);
      
      res.json({ success: true, message: 'RCRT access revoked' });
    } catch (error: any) {
      logger.error('Error revoking RCRT:', error);
      res.status(500).json({ error: 'Failed to revoke RCRT' });
    }
  });

  // Refresh token
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const tokens = await rcrtProvisionService.refreshToken(refreshToken);
      
      res.json(tokens);
    } catch (error: any) {
      logger.error('Error refreshing token:', error);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  // Security scan content
  router.post('/scan', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content required' });
      }

      const result = await securityScannerService.scanContent(content);
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error scanning content:', error);
      res.status(500).json({ error: 'Failed to scan content' });
    }
  });

  // Validate token
  router.post('/validate', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }

      const claims = await rcrtProvisionService.validateToken(token);
      
      res.json({ valid: true, claims });
    } catch (error: any) {
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  });

  // Receive KB events from RCRT (inbound)
  router.post('/events', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization' });
      }

      const token = authHeader.substring(7);
      const claims = await rcrtProvisionService.validateToken(token);

      const { eventType, kbId, entryId, data } = req.body;

      logger.info(`Received ${eventType} event from RCRT for KB ${kbId}`);

      // Security scan before processing
      if (data?.content) {
        const scanResult = await securityScannerService.scanContent(data.content);
        
        if (!scanResult.safe) {
          const quarantine = await securityScannerService.quarantineContent(data.content, scanResult);
          if (quarantine.quarantined) {
            logger.warn(`Content quarantined: ${quarantine.reason}`);
            return res.status(403).json({ 
              error: 'Content blocked', 
              reason: quarantine.reason,
              threats: scanResult.threats 
            });
          }
        }
      }

      // Process the event
      // TODO: Implement actual event processing
      
      res.json({ success: true, eventType, kbId });
    } catch (error: any) {
      logger.error('Error processing RCRT event:', error);
      res.status(500).json({ error: 'Failed to process event' });
    }
  });

  // Get breadcrumbs from RCRT (pull)
  router.get('/breadcrumbs', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization' });
      }

      const token = authHeader.substring(7);
      const claims = await rcrtProvisionService.validateToken(token);

      // TODO: Pull from RCRT via HTTP
      // For now, return empty array
      
      res.json({ breadcrumbs: [], ownerId: claims.owner_id });
    } catch (error: any) {
      logger.error('Error getting breadcrumbs:', error);
      res.status(500).json({ error: 'Failed to get breadcrumbs' });
    }
  });

  return router;
}
