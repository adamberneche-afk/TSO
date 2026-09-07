// Regression tests for P0.4: /api/v1/memory/* was mounted with zero auth
// at all. Every handler trusted a `wallet` value straight from the
// request body/query -- any caller could write fake "backup" content
// attributed to any wallet, or read/enumerate another wallet's backed-up
// private agent memories just by naming it. The whole router is now
// mounted behind authMiddleware, and every handler sources the wallet
// only from req.user.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const OWNER_WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ATTACKER_WALLET = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('/api/v1/memory', () => {
  const prisma = (global as any).prismaTest;

  afterEach(async () => {
    await prisma.cTOInsight.deleteMany({
      where: { walletAddress: { in: [OWNER_WALLET.toLowerCase(), ATTACKER_WALLET.toLowerCase()] } },
    });
  });

  it.each([
    ['post', '/api/v1/memory/backup'],
    ['get', '/api/v1/memory/restore'],
    ['get', '/api/v1/memory/status'],
  ])('rejects an unauthenticated %s %s with 401', async (method, path) => {
    const response = await (request(app) as any)[method](path);
    expect(response.status).toBe(401);
  });

  it('backs up memories under the authenticated caller, ignoring any wallet claimed in the body', async () => {
    const response = await request(app)
      .post('/api/v1/memory/backup')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ wallet: ATTACKER_WALLET, memories: [{ memoryId: 'm1', sessionSummary: {} }] });

    expect(response.status).toBe(200);
    expect(response.body.backedUp).toBe(1);

    const rows = await prisma.cTOInsight.findMany({ where: { id: 'm1' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].walletAddress).toBe(OWNER_WALLET.toLowerCase());
  });

  it('does not let an authenticated attacker restore another wallet\'s memories by naming it in the query string', async () => {
    await request(app)
      .post('/api/v1/memory/backup')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ memories: [{ memoryId: 'owner-secret', sessionSummary: { conversationSummary: 'private' } }] });

    const response = await request(app)
      .get('/api/v1/memory/restore')
      .query({ wallet: OWNER_WALLET }) // the old attack -- ignored now
      .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`)
      .expect(200);

    expect(response.body.memories).toEqual([]);
  });

  it('restores the authenticated caller\'s own memories', async () => {
    await request(app)
      .post('/api/v1/memory/backup')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ memories: [{ memoryId: 'owner-mem', sessionSummary: { conversationSummary: 'hello' } }] });

    const response = await request(app)
      .get('/api/v1/memory/restore')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .expect(200);

    expect(response.body.memories.some((m: any) => m.memoryId === 'owner-mem')).toBe(true);
  });
});
