/**
 * Weekly Insights Email Service
 * Generates and sends weekly insights to taisplatform@gmail.com
 */

import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from './analytics';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const INSIGHTS_EMAIL = 'taisplatform@gmail.com';

interface EmailReport {
  period: { start: string; end: string };
  sdk: {
    sessionsStarted: number;
    sessionsCompleted: number;
    completionRate: number;
    errorsEncountered: number;
    topErrors: Array<{ type: string; count: number }>;
    featuresUsed: Array<{ feature: string; count: number }>;
    avgTimeToFirstCall: number | null;
  };
  cto: {
    projectsCreated: number;
    projectsCompleted: number;
    avgTimeToLaunch: number | null;
    topPainPoints: Array<{ area: string; count: number }>;
  };
  recommendations: string[];
}

export class WeeklyInsightsEmailService {
  private prisma: PrismaClient;
  private analytics: AnalyticsService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.analytics = new AnalyticsService(prisma);
  }

  async sendWeeklyInsights(): Promise<{ success: boolean; message: string }> {
    console.log('[Weekly Insights] Starting report generation...');

    // Get start of current/most recent week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // Generate insights for the week
    let insights: any;
    try {
      insights = await this.analytics.getWeeklyInsights(weekStart);
    } catch (error: any) {
      console.error('[Weekly Insights] Failed to generate insights:', error);
      return { success: false, message: 'Failed to generate insights: ' + error.message };
    }

    // Build email content
    const emailContent = this.buildEmailContent(insights);

    // Send email via SendGrid
    if (!SENDGRID_API_KEY) {
      console.warn('[Weekly Insights] SendGrid API key not configured, logging email instead');
      console.log(emailContent);
      
      // Log to database
      await this.logReport(weekStart, insights, 'logged');
      return { success: true, message: 'Email logged (SendGrid not configured)' };
    }

    try {
      await this.sendEmail(emailContent);
      await this.logReport(weekStart, insights, 'sent');
      console.log('[Weekly Insights] Weekly report sent successfully');
      return { success: true, message: 'Weekly report sent' };
    } catch (error) {
      console.error('[Weekly Insights] Failed to send email:', error);
      await this.logReport(weekStart, insights, 'failed');
      return { success: false, message: 'Failed to send email' };
    }
  }

  private buildEmailContent(insights: any): string {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    return `
TAIS Platform Weekly Insights
=======================================
Week of ${formatDate(insights.period.start)} to ${formatDate(insights.period.end)}

SDK INTEGRATION ASSISTANT
───────────────────────────────────────
Sessions Started:      ${insights.sdk.sessionsStarted}
Sessions Completed:    ${insights.sdk.sessionsCompleted}
Completion Rate:       ${insights.sdk.completionRate.toFixed(1)}%
Errors Encountered:   ${insights.sdk.errorsEncountered}
Avg Time to First API: ${insights.sdk.avgTimeToFirstCall ? insights.sdk.avgTimeToFirstCall + 'ms' : 'N/A'}

${insights.sdk.topErrors.length > 0 ? `Top Errors:
${insights.sdk.topErrors.slice(0, 5).map((e: any) => `  - ${e.type}: ${e.count}`).join('\n')}` : ''}

${insights.sdk.featuresUsed.length > 0 ? `Features Used:
${insights.sdk.featuresUsed.slice(0, 5).map((f: any) => `  - ${f.feature}: ${f.count}`).join('\n')}` : ''}

CTO AGENT
───────────────────────────────────────
Projects Created:      ${insights.cto.projectsCreated}
Projects Completed:    ${insights.cto.projectsCompleted}
Avg Time to Launch:   ${insights.cto.avgTimeToLaunch ? insights.cto.avgTimeToLaunch + ' days' : 'N/A'}

${insights.cto.topPainPoints.length > 0 ? `Top Pain Points:
${insights.cto.topPainPoints.map((p: any) => `  - ${p.area}: ${p.count}`).join('\n')}` : ''}

RECOMMENDATIONS
───────────────────────────────────────
${insights.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

---
Generated: ${new Date().toISOString()}
    `.trim();
  }

  private async sendEmail(content: string): Promise<void> {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(SENDGRID_API_KEY!);

    const msg = {
      to: INSIGHTS_EMAIL,
      from: 'taisplatform@gmail.com',
      subject: `TAIS Platform Weekly Insights - ${new Date().toISOString().split('T')[0]}`,
      text: content,
    };

    await sgMail.default.send(msg);
  }

  private async logReport(weekStart: Date, insights: any, status: string): Promise<void> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      await this.prisma.weeklyInsightsReport.upsert({
        where: { id: `week-${weekStart.toISOString().split('T')[0]}` },
        create: {
          id: `week-${weekStart.toISOString().split('T')[0]}`,
          weekStart,
          weekEnd,
          reportData: insights as any,
          sessionsStarted: insights.sdk.sessionsStarted,
          sessionsCompleted: insights.sdk.sessionsCompleted,
          errorsEncountered: insights.sdk.errorsEncountered,
          topPainPoints: insights.cto.topPainPoints as any,
          topErrors: insights.sdk.topErrors as any,
          suggestions: insights.recommendations as any,
          emailStatus: status,
          generatedAt: new Date(),
          sentAt: status === 'sent' ? new Date() : undefined,
        },
        update: {
          reportData: insights as any,
          sessionsStarted: insights.sdk.sessionsStarted,
          sessionsCompleted: insights.sdk.sessionsCompleted,
          errorsEncountered: insights.sdk.errorsEncountered,
          emailStatus: status,
          sentAt: status === 'sent' ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('[Weekly Insights] Failed to log report:', error);
    }
  }
}

export default WeeklyInsightsEmailService;
