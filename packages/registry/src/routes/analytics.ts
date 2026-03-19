import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analytics';

// Extend Express Request type to include our custom properties
interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  prisma?: PrismaClient;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

export function createAnalyticsRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();
  const service = new AnalyticsService(prisma);

  // Track an event
  router.post('/track', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        eventType,
        source,
        walletAddress,
        sessionId,
        metadata,
        duration,
        errorType,
        errorMessage,
      } = req.body;

      await service.trackEvent({
        eventType,
        source,
        walletAddress,
        sessionId,
        metadata,
        duration,
        errorType,
        errorMessage,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true });
    } catch (error) {
      req.log?.error({ error }, 'Error tracking event');
      next(error);
    }
  });

  // Get weekly insights
  router.get('/insights', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { week } = req.query;
      
      let weekStart: Date;
      if (week) {
        weekStart = new Date(week as string);
      } else {
        // Default to start of current week (Monday)
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
      }

      const insights = await service.getWeeklyInsights(weekStart);

      res.json(insights);
    } catch (error) {
      req.log?.error({ error }, 'Error getting insights');
      next(error);
    }
  });

  // Get analytics summary
  router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { period = 'week' } = req.query;
      
      let startDate: Date;
      const now = new Date();
      
      switch (period) {
        case 'day':
          startDate = new Date(now.setDate(now.getDate() - 1));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default: // week
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(now.setDate(diff));
      }

      const [totalSessions, completedSessions, totalErrors, activeWallets] = await Promise.all([
        prisma.sDKAnalyticsEvent.count({
          where: { eventType: 'session_started', createdAt: { gte: startDate } },
        }),
        prisma.sDKAnalyticsEvent.count({
          where: { eventType: 'session_completed', createdAt: { gte: startDate } },
        }),
        prisma.sDKAnalyticsEvent.count({
          where: { eventType: 'error_encountered', createdAt: { gte: startDate } },
        }),
        prisma.sDKAnalyticsEvent.groupBy({
          by: ['walletAddress'],
          where: { createdAt: { gte: startDate }, walletAddress: { not: null } },
        }),
      ]);

      res.json({
        period,
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        totalErrors,
        errorRate: totalSessions > 0 ? (totalErrors / totalSessions) * 100 : 0,
        activeWallets: activeWallets.length,
      });
    } catch (error) {
      req.log?.error({ error }, 'Error getting summary');
      next(error);
    }
  });

  // Get reports
  router.get('/reports', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { limit = 10 } = req.query;

      const reports = await prisma.weeklyInsightsReport.findMany({
        orderBy: { generatedAt: 'desc' },
        take: Number(limit),
      });

      res.json({ reports });
    } catch (error) {
      req.log?.error({ error }, 'Error getting reports');
      next(error);
    }
  });

  return router;
}