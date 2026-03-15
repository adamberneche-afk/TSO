/**
 * Memory Report Service
 * Calculates alignment index and generates memory reports
 */

import { PrismaClient } from '@prisma/client';
import { createSkillsPrismaClient } from '../config/database';

const prisma = createSkillsPrismaClient();

export interface AlignmentFactors {
  driftScore: number;
  driftTrend: 'improving' | 'stable' | 'declining';
  sessionCount: number;
  avgSessionDuration: number;
  messageCount: number;
  appUsage: Record<string, number>;
  ragQueries: number;
  ragPoolUsage: Record<string, number>;
  memoriesCreated: number;
  memoriesPromoted: number;
  coreMemories: number;
}

export interface MemoryReportResult {
  alignmentIndex: number;
  driftScore: number;
  driftTrend: string;
  isFlagged: boolean;
  flagReason?: string;
  flagSeverity?: string;
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function calculateDriftPenalty(driftScore: number, trend: string): number {
  let basePenalty = driftScore * 30;
  
  if (trend === 'declining') {
    basePenalty *= 1.5;
  } else if (trend === 'improving') {
    basePenalty *= 0.5;
  }
  
  return Math.min(30, basePenalty);
}

function calculateEngagementScore(
  sessions: number,
  avgDuration: number,
  messages: number
): number {
  const sessionScore = normalizeValue(sessions, 0, 50) * 15;
  const durationScore = normalizeValue(avgDuration, 0, 60) * 10;
  const messageScore = normalizeValue(messages, 0, 500) * 15;
  
  return sessionScore + durationScore + messageScore;
}

function calculateMemoryGrowthScore(
  created: number,
  promoted: number,
  core: number
): number {
  const creationScore = Math.min(15, created * 0.5);
  const promotionScore = Math.min(10, promoted * 1);
  const coreScore = Math.min(10, core * 2);
  
  return creationScore + promotionScore + coreScore;
}

function calculateUtilizationScore(
  appUsage: Record<string, number>,
  ragQueries: number,
  ragPoolUsage: Record<string, number>
): number {
  const appCount = Object.keys(appUsage).length;
  const appDiversityScore = Math.min(10, appCount * 3);
  
  const ragScore = Math.min(10, ragQueries * 0.2);
  
  const poolDiversityScore = Math.min(5, Object.keys(ragPoolUsage).length * 2);
  
  return appDiversityScore + ragScore + poolDiversityScore;
}

export function calculateAlignmentIndex(factors: AlignmentFactors): MemoryReportResult {
  const baseScore = 50;
  
  const driftPenalty = calculateDriftPenalty(factors.driftScore, factors.driftTrend);
  const engagementScore = calculateEngagementScore(
    factors.sessionCount,
    factors.avgSessionDuration,
    factors.messageCount
  );
  const memoryGrowthScore = calculateMemoryGrowthScore(
    factors.memoriesCreated,
    factors.memoriesPromoted,
    factors.coreMemories
  );
  const utilizationScore = calculateUtilizationScore(
    factors.appUsage,
    factors.ragQueries,
    factors.ragPoolUsage
  );
  
  const alignmentIndex = Math.max(0, Math.min(100,
    baseScore - driftPenalty + engagementScore + memoryGrowthScore + utilizationScore
  ));
  
  let isFlagged = false;
  let flagReason: string | undefined;
  let flagSeverity: string | undefined;
  
  if (factors.driftScore > 0.7) {
    isFlagged = true;
    flagReason = 'high_drift';
    flagSeverity = factors.driftScore > 0.9 ? 'high' : 'medium';
  } else if (factors.sessionCount < 3 && factors.memoriesCreated < 2) {
    isFlagged = true;
    flagReason = 'low_engagement';
    flagSeverity = 'low';
  } else if (factors.driftTrend === 'declining' && factors.driftScore > 0.4) {
    isFlagged = true;
    flagReason = 'declining_alignment';
    flagSeverity = 'medium';
  } else if (alignmentIndex < 30) {
    isFlagged = true;
    flagReason = 'very_low_alignment';
    flagSeverity = 'high';
  }
  
  return {
    alignmentIndex: Math.round(alignmentIndex * 100) / 100,
    driftScore: factors.driftScore,
    driftTrend: factors.driftTrend,
    isFlagged,
    flagReason,
    flagSeverity,
  };
}

export async function getOrCreatePreferences(walletAddress: string) {
  let prefs = await prisma.memoryReportPreferences.findUnique({
    where: { walletAddress },
  });
  
  if (!prefs) {
    prefs = await prisma.memoryReportPreferences.create({
      data: { walletAddress },
    });
  }
  
  return prefs;
}

export async function updatePreferences(
  walletAddress: string,
  data: {
    reportFrequency?: string;
    includeDriftStats?: boolean;
    includeUsagePatterns?: boolean;
    includeAppUsage?: boolean;
    includeRagPools?: boolean;
    includeAlignmentIndex?: boolean;
    notifyOnFlag?: boolean;
    notifyOnDrift?: boolean;
  }
) {
  return prisma.memoryReportPreferences.update({
    where: { walletAddress },
    data,
  });
}

export async function generateMemoryReport(
  walletAddress: string,
  periodStart: Date,
  periodEnd: Date,
  factors: AlignmentFactors
): Promise<any> {
  const result = calculateAlignmentIndex(factors);
  
  const report = await prisma.memoryReport.create({
    data: {
      walletAddress,
      periodStart,
      periodEnd,
      alignmentIndex: result.alignmentIndex,
      driftScore: result.driftScore,
      driftEvents: Math.round(factors.driftScore * 100),
      driftTrend: result.driftTrend,
      totalSessions: factors.sessionCount,
      avgSessionDuration: factors.avgSessionDuration,
      messagesExchanged: factors.messageCount,
      appUsage: factors.appUsage,
      ragQueries: factors.ragQueries,
      ragPoolUsage: factors.ragPoolUsage,
      memoriesCreated: factors.memoriesCreated,
      memoriesPromoted: factors.memoriesPromoted,
      coreMemories: factors.coreMemories,
      isFlagged: result.isFlagged,
      flagReason: result.flagReason,
      flagSeverity: result.flagSeverity,
      rawData: factors as unknown as Record<string, any>,
    },
  });
  
  if (result.isFlagged) {
    await prisma.memoryReportPreferences.update({
      where: { walletAddress },
      data: {
        lastReportSentAt: new Date(),
      },
    });
  }
  
  return report;
}

export async function getUserReports(
  walletAddress: string,
  limit: number = 12
) {
  return prisma.memoryReport.findMany({
    where: { walletAddress },
    orderBy: { periodStart: 'desc' },
    take: limit,
  });
}

export async function getAggregatedStats(periodStart: Date, periodEnd: Date) {
  const reports = await prisma.memoryReport.findMany({
    where: {
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    select: {
      alignmentIndex: true,
      driftScore: true,
      driftTrend: true,
      totalSessions: true,
      messagesExchanged: true,
      isFlagged: true,
      flagReason: true,
    },
  });
  
  if (reports.length === 0) {
    return null;
  }
  
  const alignmentIndices = reports.map(r => r.alignmentIndex).sort((a, b) => a - b);
  const mean = alignmentIndices.reduce((a, b) => a + b, 0) / alignmentIndices.length;
  const variance = alignmentIndices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / alignmentIndices.length;
  const stdDev = Math.sqrt(variance);
  
  const getPercentile = (arr: number[], p: number) => {
    const idx = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  };
  
  const flaggedReasonCounts: Record<string, number> = {};
  let highDriftUsers = 0;
  
  for (const r of reports) {
    if (r.driftScore > 0.7) highDriftUsers++;
    if (r.flagReason) {
      flaggedReasonCounts[r.flagReason] = (flaggedReasonCounts[r.flagReason] || 0) + 1;
    }
  }
  
  const totalSessions = reports.reduce((a, r) => a + r.totalSessions, 0);
  const totalMessages = reports.reduce((a, r) => a + r.messagesExchanged, 0);
  
  const outlierWallets: string[] = [];
  
  const aggregate = await prisma.memoryReportAggregate.create({
    data: {
      periodStart,
      periodEnd,
      totalUsers: reports.length,
      avgAlignmentIndex: Math.round(mean * 100) / 100,
      medianAlignmentIndex: Math.round(getPercentile(alignmentIndices, 50) * 100) / 100,
      alignmentIndexStdDev: Math.round(stdDev * 100) / 100,
      alignmentP25: Math.round(getPercentile(alignmentIndices, 25) * 100) / 100,
      alignmentP50: Math.round(getPercentile(alignmentIndices, 50) * 100) / 100,
      alignmentP75: Math.round(getPercentile(alignmentIndices, 75) * 100) / 100,
      alignmentP90: Math.round(getPercentile(alignmentIndices, 90) * 100) / 100,
      alignmentP95: Math.round(getPercentile(alignmentIndices, 95) * 100) / 100,
      alignmentP99: Math.round(getPercentile(alignmentIndices, 99) * 100) / 100,
      avgDriftScore: Math.round((reports.reduce((a, r) => a + r.driftScore, 0) / reports.length) * 100) / 100,
      highDriftUsers,
      avgSessionsPerUser: Math.round((totalSessions / reports.length) * 100) / 100,
      avgMessagesPerUser: Math.round((totalMessages / reports.length) * 100) / 100,
      flaggedUsers: reports.filter(r => r.isFlagged).length,
      flaggedReasonCounts,
      outlierWallets,
    },
  });
  
  return aggregate;
}

export async function detectOutliers(
  walletAddress: string,
  currentIndex: number,
  historicalIndices: number[]
): Promise<{ isOutlier: boolean; zScore: number }> {
  if (historicalIndices.length < 5) {
    return { isOutlier: false, zScore: 0 };
  }
  
  const mean = historicalIndices.reduce((a, b) => a + b, 0) / historicalIndices.length;
  const variance = historicalIndices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalIndices.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) {
    return { isOutlier: false, zScore: 0 };
  }
  
  const zScore = Math.abs((currentIndex - mean) / stdDev);
  
  return {
    isOutlier: zScore > 2,
    zScore: Math.round(zScore * 100) / 100,
  };
}
