import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Get RCRT status - authenticated user
  router.get('/status', authenticateToken, async (req: Request, res: Response) => {
    // req.user should have walletAddress from the JWT
    let wallet = (req as any).user?.walletAddress;
    if (!wallet) {
      // fallback to query or body for convenience in testing
      wallet = (req.query.wallet as string) || (req.body && req.body.wallet);
    }
    if (!wallet) {
      return res.json({ 
        provisioned: false,
        connected: false,
        message: 'No wallet provided - login required'
      });
    }

    try {
      const agent = (await prisma.$queryRaw(
        `SELECT agent_id, token, created_at FROM rcrt_agents WHERE owner_id = ? AND revoked = false ORDER BY created_at DESC LIMIT 1`,
        wallet
      )) as { agent_id: string; token: string; created_at: Date }[];

      if (agent && agent.length > 0) {
        const a = agent[0];
        res.json({ 
          provisioned: true,
          connected: false, // RCRT connection status would need a separate heartbeat; we don't track here
          token: a.token,
          instructions: 'RCRT is provisioned. Make sure RCRT is running and connected to TAIS.'
        });
      } else {
        res.json({ 
          provisioned: false,
          connected: false,
          message: 'Not provisioned - click Provision to get started'
        });
      }
    } catch (error: any) {
      logger.error('Error getting RCRT status:', error);
      res.status(500).json({ error: 'Failed to get RCRT status' });
    }
  });

  // Provision RCRT - creates a token for the user
  router.post('/provision', authenticateToken, async (req: Request, res: Response) => {
    // req.user should have walletAddress from the JWT
    let wallet = (req as any).user?.walletAddress;
    if (!wallet) {
      // fallback to query or body for convenience in testing
      wallet = (req.query.wallet as string) || (req.body && req.body.wallet);
    }
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
      // Revoke any existing active tokens for this wallet
      await prisma.$queryRaw(
        `UPDATE rcrt_agents SET revoked = true WHERE owner_id = ? AND revoked = false`,
        wallet
      );

      const token = crypto.randomUUID();
      const agentId = `rcrt-${crypto.randomUUID()}`;
      const now = new Date();

      await prisma.$queryRaw(
        `INSERT INTO rcrt_agents (agent_id, owner_id, token, created_at, revoked) VALUES (?, ?, ?, ?, false)`,
        agentId, wallet, token, now
      );

      logger.info(`RCRT provisioned for wallet ${wallet}`);

      res.json({
        success: true,
        token: token,
        agentId: agentId,
        instructions: {
          step1: 'Download and run RCRT on your device',
          step2: 'RCRT will automatically connect to TAIS using your token',
          note: `Token: ${token.substring(0, 8)}...`
        },
        endpoints: {
          baseUrl: 'https://tso.onrender.com',
          wsPath: '/api/v1/rcrt/connect'
        }
      });
    } catch (error: any) {
      logger.error('Error provisioning RCRT:', error);
      res.status(500).json({ error: 'Failed to provision RCRT' });
    }
  });

  // RCRT connects to this endpoint to register/heartbeat
  router.post('/connect', async (req: Request, res: Response) => {
    const { token, status } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    try {
      // Find wallet by token where not revoked
      const agent = (await prisma.$queryRaw(
        `SELECT owner_id FROM rcrt_agents WHERE token = ? AND revoked = false LIMIT 1`,
        token
      )) as { owner_id: string }[];

      if (agent && agent.length > 0) {
        const wallet = agent[0].owner_id;
        res.json({ 
          success: true, 
          wallet: wallet,
          message: 'Connected to TAIS' 
        });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error: any) {
      logger.error('Error validating RCRT token:', error);
      res.status(500).json({ error: 'Failed to validate token' });
    }
  });

  // Revoke provision (optional)
  router.delete('/provision', authenticateToken, async (req: Request, res: Response) => {
    let wallet = (req as any).user?.walletAddress;
    const agentId = (req.query.agentId as string) || (req.body && req.body.agentId);
    if (!wallet) {
      // fallback to query or body for convenience in testing
      wallet = (req.query.wallet as string) || (req.body && req.body.agentId);
    }
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    try {
      if (agentId) {
        await prisma.$queryRaw(
          `UPDATE rcrt_agents SET revoked = true WHERE owner_id = ? AND agent_id = ?`,
          wallet, agentId
        );
      } else {
        // Revoke all active tokens for wallet
        await prisma.$queryRaw(
          `UPDATE rcrt_agents SET revoked = true WHERE owner_id = ? AND revoked = false`,
          wallet
        );
      }
      logger.info(`RCRT revoked for wallet ${wallet}${agentId ? ` agentId ${agentId}` : ''}`);
      res.json({ success: true, message: 'RCRT access revoked' });
    } catch (error: any) {
      logger.error('Error revoking RCRT:', error);
      res.status(500).json({ error: 'Failed to revoke RCRT' });
    }
  });

  return router;
}