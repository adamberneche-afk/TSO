// Regression tests for three monitoring-route security holes:
//
// 1. The whole '/monitoring' router (dashboard, metrics, alerts) was
//    mounted with zero authentication -- reachable by anyone on the
//    internet. This exposed internal system/DB/redis/cache stats and,
//    worse, let an anonymous caller trigger a real outbound email via
//    /monitoring/alerts/test (SendGrid) on every call. Now gated behind
//    authMiddleware + adminMiddleware, mirroring '/admin'.
// 2. checkDatabaseHealth() was `return true` unconditionally --
//    /monitoring/dashboard reported `overall: healthy` even with the
//    database fully unreachable. Now runs a real `SELECT 1`.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESSES!.split(',')[0];
const NON_ADMIN_WALLET = '0x3333333333333333333333333333333333333333';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('/monitoring auth', () => {
  it.each([
    ['/monitoring/dashboard'],
    ['/monitoring/metrics'],
  ])('rejects an unauthenticated GET %s with 401', async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
  });

  it('rejects an unauthenticated POST to the email-sending /alerts/test endpoint with 401 (never reaching SendGrid)', async () => {
    const response = await request(app).post('/monitoring/alerts/test');
    expect(response.status).toBe(401);
  });

  it('rejects an authenticated non-admin with 403', async () => {
    const response = await request(app)
      .get('/monitoring/dashboard')
      .set('Authorization', `Bearer ${authToken(NON_ADMIN_WALLET)}`);
    expect(response.status).toBe(403);
  });

  it('lets a real admin reach the dashboard', async () => {
    const response = await request(app)
      .get('/monitoring/dashboard')
      .set('Authorization', `Bearer ${authToken(ADMIN_WALLET)}`);
    expect(response.status).toBe(200);
    expect(response.body.health).toBeDefined();
  });
});

describe('/monitoring/dashboard database health', () => {
  it('reports the database as healthy when it is actually reachable', async () => {
    const response = await request(app)
      .get('/monitoring/dashboard')
      .set('Authorization', `Bearer ${authToken(ADMIN_WALLET)}`);

    expect(response.status).toBe(200);
    // Just the DB health flag this fix touches -- `overall` also folds
    // in a separate, unrelated system-memory heuristic (getSystemHealth)
    // that this test isn't exercising.
    expect(response.body.health.database).toBe(true);
  });
});
