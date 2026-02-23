/**
 * Analytics Service
 * Tracks SDK integration events for weekly insights
 */

import { PrismaClient } from '@prisma/client';

export type AnalyticsEventType = 
  | 'session_started'
  | 'session_completed'
  | 'session_abandoned'
  | 'error_encountered'
  | 'feature_used'
  | 'api_call_success'
  | 'api_call_failed'
  | 'onboarding_step'
  | 'mvp_launched'
  | 'pain_point_reported'
  | 'blocker_reported'
  | 'suggestion_offered';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  source: 'sdk_assistant' | 'cto_agent' | 'api' | 'guided_discovery';
  walletAddress?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  duration?: number;
  errorType?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface WeeklyInsights {
  period: { start: Date; end: Date };
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
    commonBlockers: Array<{ description: string; count: number }>;
  };
  recommendations: string[];
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.prisma.sDKAnalyticsEvent.create({
        data: {
          eventType: event.eventType,
          source: event.source,
          walletAddress: event.walletAddress?.toLowerCase(),
          sessionId: event.sessionId,
          metadata: event.metadata || {},
          duration: event.duration,
          errorType: event.errorType,
          errorMessage: event.errorMessage,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  async getWeeklyInsights(weekStart: Date): Promise<WeeklyInsights> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // SDK Session metrics
    const [sessionsStarted, sessionsCompleted, errors, features, timing] = await Promise.all([
      this.prisma.sDKAnalyticsEvent.count({
        where: {
          eventType: 'session_started',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.sDKAnalyticsEvent.count({
        where: {
          eventType: 'session_completed',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.sDKAnalyticsEvent.count({
        where: {
          eventType: 'error_encountered',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.sDKAnalyticsEvent.groupBy({
        by: ['metadata'],
        where: {
          eventType: 'feature_used',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        _count: true,
      }),
      this.prisma.sDKAnalyticsEvent.aggregate({
        where: {
          eventType: 'api_call_success',
          duration: { not: null },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        _avg: { duration: true },
      }),
    ]);

    // Error breakdown
    const errorBreakdown = await this.prisma.sDKAnalyticsEvent.groupBy({
      by: ['errorType'],
      where: {
        eventType: 'error_encountered',
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      _count: true,
    });

    // CTO Agent metrics
    const [ctoProjects, ctoCompletions, ctoPainPoints] = await Promise.all([
      this.prisma.cTOAgentProject.count({
        where: {
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.cTOAgentProject.count({
        where: {
          completedAt: { gte: weekStart, lt: weekEnd },
        },
      }),
      this.prisma.sDKAnalyticsEvent.findMany({
        where: {
          eventType: 'pain_point_reported',
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      sessionsStarted,
      sessionsCompleted,
      errors,
      errorBreakdown,
      ctoProjects,
      ctoPainPoints
    );

    return {
      period: { start: weekStart, end: weekEnd },
      sdk: {
        sessionsStarted,
        sessionsCompleted,
        completionRate: sessionsStarted > 0 ? (sessionsCompleted / sessionsStarted) * 100 : 0,
        errorsEncountered: errors,
        topErrors: errorBreakdown.map(e => ({
          type: e.errorType || 'unknown',
          count: e._count,
        })),
        featuresUsed: features.map(f => ({
          feature: (f.metadata as any)?.feature || 'unknown',
          count: f._count,
        })),
        avgTimeToFirstCall: timing._avg.duration || null,
      },
      cto: {
        projectsCreated: ctoProjects,
        projectsCompleted: ctoCompletions,
        avgTimeToLaunch: null, // Would need to calculate from completed projects
        topPainPoints: this.aggregatePainPoints(ctoPainPoints),
        commonBlockers: [],
      },
      recommendations,
    };
  }

  private aggregatePainPoints(events: any[]): Array<{ area: string; count: number }> {
    const areaCounts = new Map<string, number>();
    
    events.forEach(event => {
      const metadata = event.metadata as any;
      const area = metadata?.area || 'unknown';
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    });

    return Array.from(areaCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private generateRecommendations(
    sessionsStarted: number,
    sessionsCompleted: number,
    errors: number,
    errorBreakdown: any[],
    ctoProjects: number,
    ctoPainPoints: any[]
  ): string[] {
    const recommendations: string[] = [];

    // SDK recommendations
    const completionRate = sessionsStarted > 0 ? (sessionsCompleted / sessionsStarted) * 100 : 0;
    
    if (completionRate < 50 && sessionsStarted > 0) {
      recommendations.push('Consider improving onboarding flow - completion rate is below 50%');
    }

    if (errors > sessionsStarted * 0.3) {
      const topError = errorBreakdown[0];
      if (topError) {
        recommendations.push(`High error rate detected. Most common: ${topError.errorType || 'unknown'}`);
      }
    }

    // CTO recommendations
    if (ctoPainPoints.length > 0) {
      const areaCounts = new Map<string, number>();
      ctoPainPoints.forEach((p: any) => {
        const area = (p.metadata as any)?.area || 'unknown';
        areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
      });

      const topArea = Array.from(areaCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (topArea) {
        recommendations.push(`Most reported pain point area: ${topArea[0]}. Consider adding documentation or tools.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Great week! No major issues detected.');
    }

    return recommendations;
  }

  async generateWeeklyReport(weekStart: Date): Promise<void> {
    const insights = await this.getWeeklyInsights(weekStart);

    await this.prisma.weeklyInsightsReport.create({
      data: {
        weekStart,
        weekEnd: insights.period.end,
        reportData: insights as any,
        sessionsStarted: insights.sdk.sessionsStarted,
        sessionsCompleted: insights.sdk.sessionsCompleted,
        errorsEncountered: insights.sdk.errorsEncountered,
        topPainPoints: insights.cto.topPainPoints as any,
        topErrors: insights.sdk.topErrors as any,
        suggestions: insights.recommendations as any,
      },
    });
  }
}

export default AnalyticsService;
