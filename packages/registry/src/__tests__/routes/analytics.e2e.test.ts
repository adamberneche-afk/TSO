// Regression tests for mounting the analytics API route.
//
// createAnalyticsRoutes (POST /track, GET /insights, /summary, /reports)
// was implemented but never imported/mounted in index.ts at all, so none
// of it was reachable on a running server. It's now mounted at
// /api/v1/analytics: POST /track stays open (anonymous SDK session
// telemetry can legitimately arrive before a wallet is ever connected),
// but the GET endpoints expose aggregate platform-wide usage stats and are
// gated behind authMiddleware + adminMiddleware, mirroring '/monitoring'.
//
// Also covers /track preferring the authenticated caller's wallet over a
// client-submitted one when both are present.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESSES!.split(',')[0];
const NON_ADMIN_WALLET = '0x4444444444444444444444444444444444444444';
const CLAIMED_WALLET = '0x5555555555555555555555555555555555555555';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('/analytics', () => {
  const prisma = (global as any).prismaTest;

  describe('GET endpoints (admin-only)', () => {
    it.each([
      ['/api/v1/analytics/insights'],
      ['/api/v1/analytics/summary'],
      ['/api/v1/analytics/reports'],
    ])('rejects an unauthenticated GET %s with 401', async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    });

    it.each([
      ['/api/v1/analytics/insights'],
      ['/api/v1/analytics/summary'],
      ['/api/v1/analytics/reports'],
    ])('rejects an authenticated non-admin GET %s with 403', async (path) => {
      const response = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${authToken(NON_ADMIN_WALLET)}`);
      expect(response.status).toBe(403);
    });

    it('lets a real admin read the summary', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${authToken(ADMIN_WALLET)}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSessions');
    });
  });

  describe('POST /track', () => {
    afterEach(async () => {
      await prisma.sDKAnalyticsEvent.deleteMany({ where: { sessionId: { startsWith: 'analytics-test-' } } });
    });

    it('accepts an unauthenticated (anonymous) tracking event', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/track')
        .send({ eventType: 'session_started', source: 'sdk_assistant', sessionId: 'analytics-test-anon' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const stored = await prisma.sDKAnalyticsEvent.findFirst({ where: { sessionId: 'analytics-test-anon' } });
      expect(stored).not.toBeNull();
      expect(stored.walletAddress).toBeNull();
    });

    it('records the authenticated wallet instead of a client-submitted one', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/track')
        .set('Authorization', `Bearer ${authToken(ADMIN_WALLET)}`)
        .send({
          eventType: 'session_started',
          source: 'sdk_assistant',
          sessionId: 'analytics-test-spoof',
          walletAddress: CLAIMED_WALLET, // attacker-controlled claim
        });

      expect(response.status).toBe(200);

      const stored = await prisma.sDKAnalyticsEvent.findFirst({ where: { sessionId: 'analytics-test-spoof' } });
      expect(stored.walletAddress).toBe(ADMIN_WALLET.toLowerCase());
      expect(stored.walletAddress).not.toBe(CLAIMED_WALLET.toLowerCase());
    });
  });
});
