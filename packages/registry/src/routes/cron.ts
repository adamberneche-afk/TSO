import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import WeeklyInsightsEmailService from '../services/weeklyInsightsEmail';
import { pruneExpiredVersions } from '../services/configurationVersioning';
import { generateMemoryReport, getAggregatedStats, getOrCreatePreferences, computeAlignmentFactors } from '../services/memoryReports';
import { sendMemoryReportEmail } from '../services/memoryReportEmail';

interface AuthUser {
  walletAddress: string;
}

// These endpoints trigger real side effects (emails to real users, DB
// deletes) and are meant to be called only by a scheduled job presenting
// a shared secret. `if (expectedToken && authHeader !== ...)` fails OPEN,
// not closed, when CRON_SECRET is unset: the whole check short-circuits
// to false and every request is let through unauthenticated -- the
// comment calling this "development" behavior notwithstanding, nothing
// here actually restricts it to non-production. Refuses to serve at all
// (in every environment) when the secret isn't configured, rather than
// silently becoming public.
function requireCronSecret(req: Request, res: Response, logger: any): boolean {
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    logger.error('[Cron] CRON_SECRET is not set -- refusing to serve this endpoint');
    res.status(503).json({ error: 'Cron endpoint disabled: CRON_SECRET is not configured' });
    return false;
  }

  if (req.headers.authorization !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export function createAdminRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();

  // Weekly insights cron endpoint
  router.post('/weekly-insights', async (req: Request, res: Response) => {
    if (!requireCronSecret(req, res, logger)) return;

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
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // Prune expired configuration versions
  router.post('/prune-versions', async (req: Request, res: Response) => {
    if (!requireCronSecret(req, res, logger)) return;

    try {
      logger.info('[Cron] Starting configuration version pruning...');
      
      const deletedCount = await pruneExpiredVersions();
      
      logger.info(`[Cron] Pruned ${deletedCount} expired versions`);
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      logger.error('[Cron] Error pruning versions:', error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // Memory reports cron - generates weekly alignment reports
  router.post('/memory-reports', async (req: Request, res: Response) => {
    if (!requireCronSecret(req, res, logger)) return;

    try {
      logger.info('[Cron] Starting memory report generation...');
      
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 7);
      
      const allUsers = await prisma.rAGUserUsage.findMany({
        select: { walletAddress: true },
        where: { walletAddress: { not: '' } },
      });
      
      let reportsGenerated = 0;
      let flaggedUsers = 0;
      const errors: string[] = [];

      for (const user of allUsers) {
        if (!user.walletAddress || user.walletAddress === '') continue;
        
        try {
          const prefs = await getOrCreatePreferences(user.walletAddress);
          
          if (prefs.reportFrequency === 'never') {
            continue;
          }
          
          const shouldSendNow = prefs.reportFrequency === 'weekly' || 
            (prefs.reportFrequency === 'biweekly' && periodEnd.getDate() % 14 === 0) ||
            (prefs.reportFrequency === 'monthly' && periodEnd.getDate() === 1);
          
          if (!shouldSendNow && prefs.lastReportSentAt) {
            continue;
          }

          const factors = await computeAlignmentFactors(user.walletAddress, periodStart, periodEnd);

          const report = await generateMemoryReport(
            user.walletAddress,
            periodStart,
            periodEnd,
            factors
          );
          
          reportsGenerated++;
          
          if (report.isFlagged && prefs.notifyOnFlag) {
            flaggedUsers++;
            
            try {
              await sendMemoryReportEmail(user.walletAddress, report, prefs);
            } catch (emailErr) {
              logger.warn(`[Cron] Failed to send flagged notification to ${user.walletAddress.slice(0, 6)}...`);
            }
          }
          
          if (shouldSendNow) {
            try {
              await sendMemoryReportEmail(user.walletAddress, report, prefs);
            } catch (emailErr) {
              logger.warn(`[Cron] Failed to send report to ${user.walletAddress.slice(0, 6)}...`);
            }
          }
        } catch (userErr: any) {
          errors.push(`${user.walletAddress?.slice(0, 6)}: ${userErr.message}`);
        }
      }
      
      const aggregate = await getAggregatedStats(periodStart, periodEnd);
      
      logger.info(`[Cron] Generated ${reportsGenerated} memory reports, ${flaggedUsers} flagged`);
      res.json({ 
        success: true, 
        reportsGenerated, 
        flaggedUsers,
        aggregateId: aggregate?.id,
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error: any) {
      logger.error('[Cron] Error generating memory reports:', error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  return router;
}

export default createAdminRoutes;
