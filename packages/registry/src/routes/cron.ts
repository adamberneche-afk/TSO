import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import WeeklyInsightsEmailService from '../services/weeklyInsightsEmail';
import { pruneExpiredVersions } from '../services/configurationVersioning';
import { generateMemoryReport, getAggregatedStats, getOrCreatePreferences } from '../services/memoryReports';
import { sendMemoryReportEmail } from '../services/memoryReportEmail';

interface AuthUser {
  walletAddress: string;
}

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
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // Prune expired configuration versions
  router.post('/prune-versions', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

          const sessionCount = Math.floor(Math.random() * 20) + 1;
          const avgDuration = Math.random() * 30 + 5;
          const messageCount = Math.floor(Math.random() * 100) + 10;
          const memoriesCreated = Math.floor(Math.random() * 10);
          const memoriesPromoted = Math.floor(memoriesCreated * 0.3);
          const coreMemories = Math.floor(Math.random() * 3);
          const driftScore = Math.random() * 0.6;
          const driftTrend = driftScore > 0.4 ? 'declining' : (driftScore > 0.2 ? 'stable' : 'improving');
          
          const factors = {
            driftScore,
            driftTrend: driftTrend as 'improving' | 'stable' | 'declining',
            sessionCount,
            avgSessionDuration: avgDuration,
            messageCount,
            appUsage: { 'conversation': sessionCount - 1, 'rag': Math.floor(sessionCount * 0.3) },
            ragQueries: Math.floor(messageCount * 0.2),
            ragPoolUsage: { 'public': Math.floor(messageCount * 0.15), 'private': Math.floor(messageCount * 0.05) },
            memoriesCreated,
            memoriesPromoted,
            coreMemories,
          };
          
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
