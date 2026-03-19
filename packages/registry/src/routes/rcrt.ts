import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

interface UserWithWallet {
  walletAddress: string;
}

function extractWallet(req: Request): string | undefined {
   // Try to get wallet from Authorization header (JWT)
   const authHeader = req.headers.authorization;
   if (authHeader) {
     const token = authHeader.replace('Bearer ', '');
     try {
       // Decode JWT payload (base64url)
       const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
       if (payload.walletAddress) {
         return payload.walletAddress;
       }
     } catch {
       // invalid token, continue to other sources
     }
   }
   // Fallback to query/body
   return (req.query.wallet as string) || (req.body && (req.body as Record<string, any>).wallet as string);
 }

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Get RCRT status - use authenticated user wallet or fallback to query/body
  router.get('/status', async (req: Request, res: Response) => {
    const wallet = extractWallet(req);
    
    if (!wallet) {
      return res.json({ 
        provisioned: false,
        connected: false,
        message: 'No wallet provided - login required'
      });
    }

    try {
      const agents = await prisma.rCRTAgent.findMany({
        where: {
          ownerId: wallet,
          revoked: false
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      });

      if (agents && agents.length > 0) {
        const a = agents[0];
        res.json({ 
          provisioned: true,
          connected: false,
          token: a.token,
          agentId: a.agentId,
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
  router.post('/provision', async (req: Request, res: Response) => {
    const wallet = extractWallet(req);
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    try {
      // Revoke any existing active tokens for this wallet
      await prisma.$executeRawUnsafe(
        `UPDATE rcrt_agents SET revoked = true WHERE owner_id = $1 AND revoked = false`,
        wallet
      );

      const token = crypto.randomUUID();
      const agentId = `rcrt-${crypto.randomUUID()}`;
      const now = new Date();

      // Use typed insert via Prisma
      await prisma.rCRTAgent.create({
        data: {
          agentId: agentId,
          ownerId: wallet,
          token: token,
          status: 'active',
          revoked: false,
          provisionedAt: now,
          createdAt: now
        }
      });

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
      const agent = await prisma.rCRTAgent.findFirst({
        where: {
          token: token,
          revoked: false
        }
      });

      if (agent) {
        res.json({ 
          success: true, 
          wallet: agent.ownerId,
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
  router.delete('/provision', async (req: Request, res: Response) => {
    const wallet = extractWallet(req);
    const agentId = (req.query.agentId as string) || (req.body && req.body.agentId);
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    try {
      if (agentId) {
        await prisma.rCRTAgent.updateMany({
          where: {
            ownerId: wallet,
            agentId: agentId
          },
          data: {
            revoked: true
          }
        });
      } else {
        // Revoke all active tokens for wallet
        await prisma.rCRTAgent.updateMany({
          where: {
            ownerId: wallet,
            revoked: false
          },
          data: {
            revoked: true
          }
        });
      }
      logger.info(`RCRT revoked for wallet ${wallet}${agentId ? ` agentId ${agentId}` : ''}`);
      res.json({ success: true, message: 'RCRT access revoked' });
    } catch (error: any) {
      logger.error('Error revoking RCRT:', error);
      res.status(500).json({ error: 'Failed to revoke RCRT' });
    }
  });

  // Get RCRT audit logs
  router.get('/audit', async (req: Request, res: Response) => {
    const wallet = extractWallet(req);
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const action = req.query.action as string | undefined;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    try {
      let query = `SELECT * FROM rcrt_audit_logs WHERE owner_id = $1`;
      const params: any[] = [wallet];

      if (action) {
        query += ` AND action = $${params.length + 1}`;
        params.push(action);
      }
      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }
      if (startDate) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(endDate);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

        const logsRaw = await prisma.$queryRawUnsafe(query, ...params);
        const logs = logsRaw as Array<{
          id: string;
          owner_id: string;
          action: string;
          agent_id: string | null;
          token: string | null;
          status: string | null;
          error_message: string | null;
          context_type: string | null;
          target_app_id: string | null;
          breadcrumb_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          duration: number | null;
          created_at: Date;
        }>;

      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM rcrt_audit_logs WHERE owner_id = $1`;
      const countParams: any[] = [wallet];
      if (action) {
        countQuery += ` AND action = $${countParams.length + 1}`;
        countParams.push(action);
      }
      if (status) {
        countQuery += ` AND status = $${countParams.length + 1}`;
        countParams.push(status);
      }
      if (startDate) {
        countQuery += ` AND created_at >= $${countParams.length + 1}`;
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ` AND created_at <= $${countParams.length + 1}`;
        countParams.push(endDate);
      }

      const countResult = await prisma.$queryRawUnsafe(
        countQuery,
        ...countParams
      ) as { total: bigint }[];
      const total = Number(countResult[0]?.total || 0);

      res.json({
        logs: logs.map(log => ({
          ...log,
          createdAt: log.created_at,
          ownerId: log.owner_id,
          agentId: log.agent_id,
          errorMessage: log.error_message,
          contextType: log.context_type,
          targetAppId: log.target_app_id,
          breadcrumbId: log.breadcrumb_id,
          ipAddress: log.ip_address,
          userAgent: log.user_agent
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + logs.length < total
        }
      });
    } catch (error: any) {
      logger.error('Error getting RCRT audit logs:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  });

  // Create audit log entry (internal)
  router.post('/audit', async (req: Request, res: Response) => {
    const {
      ownerId,
      action,
      agentId,
      token,
      status,
      errorMessage,
      contextType,
      targetAppId,
      breadcrumbId,
      ipAddress,
      userAgent,
      duration
    } = req.body;

    if (!ownerId || !action) {
      return res.status(400).json({ error: 'ownerId and action are required' });
    }

    try {
      const maskedToken = token ? token.substring(0, 8) : null;
      const now = new Date();

      await prisma.$executeRawUnsafe(
        `INSERT INTO rcrt_audit_logs 
         (id, owner_id, action, agent_id, token, status, error_message, context_type, target_app_id, breadcrumb_id, ip_address, user_agent, duration, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        crypto.randomUUID(),
        ownerId,
        action,
        agentId || null,
        maskedToken,
        status || 'success',
        errorMessage || null,
        contextType || null,
        targetAppId || null,
        breadcrumbId || null,
        ipAddress || null,
        userAgent || null,
        duration || null,
        now
      );

      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error creating RCRT audit log:', error);
      res.status(500).json({ error: 'Failed to create audit log' });
    }
  });

  return router;
}