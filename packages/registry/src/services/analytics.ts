/**
 * Analytics Service
 * Tracks SDK integration events for weekly insights
 */

import { PrismaClient, Prisma } from '@prisma/client';

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
  metadata?: Prisma.JsonValue;
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
          metadata: event.metadata ?? {},
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
    
    // Get events for the week
    const events = await this.prisma.sDKAnalyticsEvent.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // SDK insights
    const sdkEvents = events.filter(e => e.source === 'sdk_assistant');
    const sessionsStarted = sdkEvents.filter(e => e.eventType === 'session_started').length;
    const sessionsCompleted = sdkEvents.filter(e => e.eventType === 'session_completed').length;
    const completionRate = sessionsStarted > 0 ? (sessionsCompleted / sessionsStarted) * 100 : 0;
    const errorsEncountered = sdkEvents.filter(e => e.eventType === 'error_encountered').length;
    
    // Top errors
    const errorCounts: Record<string, number> = {};
    sdkEvents
      .filter(e => e.eventType === 'error_encountered' && e.errorType)
      .forEach(e => {
        errorCounts[e.errorType!] = (errorCounts[e.errorType!] || 0) + 1;
      });
    const topErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Features used
    const featureCounts: Record<string, number> = {};
    sdkEvents
      .filter(e => e.eventType === 'feature_used' && e.metadata && typeof e.metadata === 'object' && e.metadata !== null && !Array.isArray(e.metadata) && 'feature' in e.metadata)
      .forEach(e => {
        const feature = (e.metadata as { feature: string }).feature;
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      });
    const featuresUsed = Object.entries(featureCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([feature, count]) => ({ feature, count }));

    // Average time to first call
    const firstCallEvents = sdkEvents
      .filter(e => e.eventType === 'api_call_success' || e.eventType === 'api_call_failed')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const avgTimeToFirstCall = firstCallEvents.length > 0 
      ? firstCallEvents[0].duration ?? null 
      : null;

    // CTO insights
    const ctoEvents = events.filter(e => e.source === 'cto_agent');
    const projectsCreated = ctoEvents.filter(e => e.eventType === 'mvp_launched').length;
    const projectsCompleted = ctoEvents.filter(e => e.eventType === 'mvp_launched' && e.metadata && typeof e.metadata === 'object' && e.metadata !== null && !Array.isArray(e.metadata) && 'status' in e.metadata && e.metadata.status === 'completed').length;
    
    // Average time to launch
    const launchedProjects = ctoEvents.filter(e => e.eventType === 'mvp_launched' && e.duration);
    const avgTimeToLaunch = launchedProjects.length > 0
      ? launchedProjects.reduce((sum, p) => sum + (p.duration ?? 0), 0) / launchedProjects.length
      : null;
    
    // Top pain points
    const painPointCounts: Record<string, number> = {};
    ctoEvents
      .filter(e => e.eventType === 'pain_point_reported' && e.metadata && typeof e.metadata === 'object' && e.metadata !== null && !Array.isArray(e.metadata) && 'area' in e.metadata)
      .forEach(e => {
        const area = (e.metadata as { area: string }).area;
        painPointCounts[area] = (painPointCounts[area] || 0) + 1;
      });
    const topPainPoints = Object.entries(painPointCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }));

    // Common blockers
    const blockerCounts: Record<string, number> = {};
    ctoEvents
      .filter(e => e.eventType === 'blocker_reported' && e.metadata && typeof e.metadata === 'object' && e.metadata !== null && !Array.isArray(e.metadata) && 'description' in e.metadata)
      .forEach(e => {
        const description = (e.metadata as { description: string }).description;
        blockerCounts[description] = (blockerCounts[description] || 0) + 1;
      });
    const commonBlockers = Object.entries(blockerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([description, count]) => ({ description, count }));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (sessionsStarted > 0 && completionRate < 50) {
      recommendations.push('Improve SDK onboarding to increase session completion rate');
    }
    
    if (errorsEncountered > 10) {
      recommendations.push('Investigate and fix common SDK errors');
    }
    
    if (projectsCreated > 0 && (avgTimeToLaunch ?? 0) > 86400000) { // More than 1 day
      recommendations.push('Streamline MVP launch process to reduce time-to-market');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - maintain current practices');
    }

    return {
      period: { start: weekStart, end: weekEnd },
      sdk: {
        sessionsStarted,
        sessionsCompleted,
        completionRate,
        errorsEncountered,
        topErrors,
        featuresUsed,
        avgTimeToFirstCall
      },
      cto: {
        projectsCreated,
        projectsCompleted,
        avgTimeToLaunch,
        topPainPoints,
        commonBlockers
      },
      recommendations
    };
  }
}