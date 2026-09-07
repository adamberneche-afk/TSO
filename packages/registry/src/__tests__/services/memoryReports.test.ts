// Regression test for the fabricated memory-alignment report bug.
//
// cron.ts used to compute every AlignmentFactors field with Math.random()
// and persist/email the result as if it were real per-wallet analytics --
// including a "drift score" that could label a user's agent as
// "declining" purely from noise, independent of anything the user
// actually did. computeAlignmentFactors replaces that: real fields
// (session count, average duration, message count, per-app usage,
// memories created) are computed from actual usage tables, and fields
// with no real backing data anywhere in the schema (driftScore/driftTrend,
// memoriesPromoted, coreMemories, ragQueries/ragPoolUsage) report a
// neutral, honest "not tracked yet" value instead of a fabricated one.

import { PrismaClient } from '@prisma/client';
import { computeAlignmentFactors } from '../../services/memoryReports';

const prisma = new PrismaClient();

describe('computeAlignmentFactors', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('computes real usage data and reports untracked fields as neutral, not random', async () => {
    const wallet = '0x' + Date.now().toString(16).padStart(40, '0');
    const appId = 'alignment-test-' + Date.now();

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const withinPeriod = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

    await prisma.agentApp.create({
      data: {
        appId,
        name: 'Alignment Test App',
        redirectUris: ['http://localhost/callback'],
        appSecret: 'irrelevant-hash',
      },
    });

    const session = await prisma.agentSession.create({
      data: {
        sessionId: 'sess_' + Date.now(),
        walletAddress: wallet,
        appId,
        startedAt: withinPeriod,
        lastActiveAt: new Date(withinPeriod.getTime() + 10 * 60 * 1000), // 10 minutes later
      },
    });

    await prisma.agentSessionMessage.createMany({
      data: [
        { sessionId: session.id, role: 'user', content: 'hi', createdAt: withinPeriod },
        { sessionId: session.id, role: 'assistant', content: 'hello', createdAt: withinPeriod },
        { sessionId: session.id, role: 'user', content: 'bye', createdAt: withinPeriod },
      ],
    });

    await prisma.appUsageMetric.create({
      data: {
        appId,
        walletAddress: wallet,
        interactionType: 'chat',
        timestamp: withinPeriod,
      },
    });

    await prisma.agentMemoryEntry.createMany({
      data: [
        { walletAddress: wallet, appId, type: 'FACT', summary: 'likes cats', details: {}, createdAt: withinPeriod },
        { walletAddress: wallet, appId, type: 'PREFERENCE', summary: 'dark mode', details: {}, createdAt: withinPeriod },
      ],
    });

    const factors = await computeAlignmentFactors(wallet, periodStart, periodEnd);

    // Real, computed values.
    expect(factors.sessionCount).toBe(1);
    expect(factors.avgSessionDuration).toBeCloseTo(10, 1);
    expect(factors.messageCount).toBe(3);
    expect(factors.appUsage).toEqual({ [appId]: 1 });
    expect(factors.memoriesCreated).toBe(2);

    // No real data source exists for these -- must be a fixed neutral
    // value, never Math.random(). Calling twice must give identical
    // results, which a random implementation would not.
    expect(factors.driftScore).toBe(0);
    expect(factors.driftTrend).toBe('stable');
    expect(factors.memoriesPromoted).toBe(0);
    expect(factors.coreMemories).toBe(0);
    expect(factors.ragQueries).toBe(0);
    expect(factors.ragPoolUsage).toEqual({});

    const again = await computeAlignmentFactors(wallet, periodStart, periodEnd);
    expect(again).toEqual(factors);
  });

  it('returns zeros for a wallet with no activity in the period, not random noise', async () => {
    const wallet = '0x' + (Date.now() + 1).toString(16).padStart(40, '0');
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const factors = await computeAlignmentFactors(wallet, periodStart, periodEnd);

    expect(factors.sessionCount).toBe(0);
    expect(factors.avgSessionDuration).toBe(0);
    expect(factors.messageCount).toBe(0);
    expect(factors.appUsage).toEqual({});
    expect(factors.memoriesCreated).toBe(0);
  });
});
