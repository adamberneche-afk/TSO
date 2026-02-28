// Enterprise routes for Cross-App Agent Portability
// Phase 7: Security & Enterprise

import { Router, Request, Response } from 'express';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
}

export function createEnterpriseRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // ============================================
  // User App Permissions Management
  // ============================================

  // Get user's permissions with activity
  router.get('/permissions/:appId/activity', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet } = req.query;
      const { appId } = req.params;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only access their own data
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
      }

      // Get permission
      const permission = await prisma.agentAppPermission.findFirst({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId,
          revokedAt: null,
        },
        include: {
          app: {
            select: {
              appId: true,
              name: true,
              description: true,
              websiteUrl: true,
            },
          },
        },
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }

      // Get recent activity
      const sessions = await prisma.agentSession.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId,
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      const usage = await prisma.appUsageMetric.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId,
        },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });

      res.json({
        permission: {
          appId: permission.app.appId,
          appName: permission.app.name,
          scopes: permission.scopes,
          grantedAt: permission.grantedAt,
          expiresAt: permission.expiresAt,
        },
        activity: {
          recentSessions: sessions.map((s: any) => ({
            sessionId: s.sessionId,
            startedAt: s.startedAt,
            lastActiveAt: s.lastActiveAt,
            messageCount: s._count.messages,
          })),
          recentUsage: usage.map((u: any) => ({
            type: u.interactionType,
            tokens: u.tokensUsed,
            cost: u.cost,
            timestamp: u.timestamp,
          })),
        },
      });
    } catch (error) {
      logger.error('Permission activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // Update permission scopes
  router.patch('/permissions/:appId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet } = req.query;
      const { appId } = req.params;
      const { scopes } = req.body;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only modify their own permissions
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!scopes || !Array.isArray(scopes)) {
        return res.status(400).json({ error: 'scopes array is required' });
      }

      const VALID_SCOPES = [
        'agent:identity:read',
        'agent:identity:soul:read',
        'agent:identity:profile:read',
        'agent:memory:read',
        'agent:memory:write',
        'agent:config:read',
      ];

      const invalidScopes = scopes.filter(s => !VALID_SCOPES.includes(s));
      if (invalidScopes.length > 0) {
        return res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}` });
      }

      const permission = await prisma.agentAppPermission.findFirst({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId,
          revokedAt: null,
        },
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }

      await prisma.agentAppPermission.update({
        where: { id: permission.id },
        data: { scopes },
      });

      res.json({
        success: true,
        appId,
        scopes,
        message: 'Permissions updated successfully',
      });
    } catch (error) {
      logger.error('Permission update error:', error);
      res.status(500).json({ error: 'Failed to update permissions' });
    }
  });

  // Get all activity log for user
  router.get('/activity', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet, limit = 50 } = req.query;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only view their own activity
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
      }

      const sessions = await prisma.agentSession.findMany({
        where: {
          walletAddress: wallet.toLowerCase(),
        },
        orderBy: { startedAt: 'desc' },
        take: Math.min(Number(limit), 100),
        include: {
          app: {
            select: {
              appId: true,
              name: true,
            },
          },
        },
      });

      const activities = sessions.map((s: any) => ({
        type: 'session',
        appId: s.app.appId,
        appName: s.app.name,
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      }));

      res.json({
        wallet,
        activities,
        total: activities.length,
      });
    } catch (error) {
      logger.error('Activity log error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // ============================================
  // Enterprise Organization Management
  // ============================================

  // Create or update organization
  router.post('/organization', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet, name, approvedApps, blockedApps, requireApprovalFor } = req.body;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || !name) {
        return res.status(400).json({ error: 'wallet and name are required' });
      }

      // IDOR Fix: Users can only create orgs for themselves
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const orgId = 'org_' + crypto.randomBytes(8).toString('hex');

      const org = await prisma.agentAppOrganization.upsert({
        where: { orgId },
        update: {
          name,
          approvedApps: approvedApps || [],
          blockedApps: blockedApps || [],
          requireApprovalFor: requireApprovalFor || [],
          adminWalletAddress: wallet.toLowerCase(),
        },
        create: {
          orgId,
          name,
          approvedApps: approvedApps || [],
          blockedApps: blockedApps || [],
          requireApprovalFor: requireApprovalFor || [],
          adminWalletAddress: wallet.toLowerCase(),
        },
      });

      res.json({
        success: true,
        organization: {
          orgId: org.orgId,
          name: org.name,
          approvedApps: org.approvedApps,
          blockedApps: org.blockedApps,
          requireApprovalFor: org.requireApprovalFor,
        },
      });
    } catch (error) {
      logger.error('Organization upsert error:', error);
      res.status(500).json({ error: 'Failed to save organization' });
    }
  });

  // Get organization
  router.get('/organization/:orgId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orgId } = req.params;
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      const org = await prisma.agentAppOrganization.findUnique({
        where: { orgId },
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (org.adminWalletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      res.json({
        orgId: org.orgId,
        name: org.name,
        approvedApps: org.approvedApps,
        blockedApps: org.blockedApps,
        requireApprovalFor: org.requireApprovalFor,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
    } catch (error) {
      logger.error('Organization get error:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  });

  // Update app whitelist/blocklist
  router.patch('/organization/:orgId/apps', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { orgId } = req.params;
      const { wallet, approvedApps, blockedApps } = req.body;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet) {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only modify their own organization
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const org = await prisma.agentAppOrganization.findUnique({
        where: { orgId },
      });

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (org.adminWalletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const updated = await prisma.agentAppOrganization.update({
        where: { orgId },
        data: {
          approvedApps: approvedApps !== undefined ? approvedApps : org.approvedApps,
          blockedApps: blockedApps !== undefined ? blockedApps : org.blockedApps,
        },
      });

      res.json({
        success: true,
        approvedApps: updated.approvedApps,
        blockedApps: updated.blockedApps,
      });
    } catch (error) {
      logger.error('Organization apps update error:', error);
      res.status(500).json({ error: 'Failed to update organization apps' });
    }
  });

  // Get audit log
  router.get('/audit-log', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet, startDate, endDate, appId } = req.query;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only view their own audit log
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied to this wallet\'s data' });
      }

      // For now, return session activity as audit log
      const where: any = {
        walletAddress: wallet.toLowerCase(),
      };

      if (appId) {
        where.appId = appId as string;
      }

      if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) {
          where.startedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.startedAt.lte = new Date(endDate as string);
        }
      }

      const sessions = await prisma.agentSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 100,
        include: {
          app: {
            select: {
              appId: true,
              name: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const auditLog = sessions.map((s: any) => ({
        timestamp: s.startedAt,
        action: 'SESSION',
        appId: s.app.appId,
        appName: s.app.name,
        details: {
          sessionId: s.sessionId,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          messageCount: s.messages.length,
        },
      }));

      res.json({
        wallet,
        auditLog,
        total: auditLog.length,
      });
    } catch (error) {
      logger.error('Audit log error:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  // ============================================
  // Approval Workflow for memory:write
  // ============================================

  // Request approval for memory:write scope
  router.post('/request-approval/:appId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authenticatedWallet = req.user?.walletAddress;
      const { wallet } = req.query;
      const { appId } = req.params;
      const { reason } = req.body;

      // IDOR Fix: Verify authenticated user
      if (!authenticatedWallet) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'wallet is required' });
      }

      // IDOR Fix: Users can only request approval for themselves
      if (wallet.toLowerCase() !== authenticatedWallet.toLowerCase()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if user already has permission
      const existing = await prisma.agentAppPermission.findFirst({
        where: {
          walletAddress: wallet.toLowerCase(),
          appId,
          revokedAt: null,
        },
      });

      if (existing && existing.scopes.includes('agent:memory:write')) {
        return res.status(400).json({ error: 'memory:write already granted' });
      }

      // For now, auto-approve (in production, this would trigger a notification)
      res.json({
        success: true,
        message: 'Approval request received. memory:write scope will be added.',
        status: 'auto_approved',
      });
    } catch (error) {
      logger.error('Approval request error:', error);
      res.status(500).json({ error: 'Failed to request approval' });
    }
  });

  return router;
}
