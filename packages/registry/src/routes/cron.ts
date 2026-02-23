import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import WeeklyInsightsEmailService from '../services/weeklyInsightsEmail';

export function createAdminRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();

  // Weekly insights cron endpoint
  router.post('/weekly-insights', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.CRON_SECRET;

    // Allow if no secret configured (development) or secret matches
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      logger.info('[Cron] Starting weekly insights generation...');
      
      const emailService = new WeeklyInsightsEmailService(prisma);
      const result = await emailService.sendWeeklyInsights();

      if (result.success) {
        logger.info('[Cron] Weekly insights sent successfully');
        res.json({ success: true, message: result.message });
      } else {
        logger.error('[Cron] Failed to send weekly insights:', result.message);
        res.status(500).json({ success: false, error: result.message });
      }
    } catch (error: any) {
      logger.error('[Cron] Error generating weekly insights:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createAdminRoutes;
