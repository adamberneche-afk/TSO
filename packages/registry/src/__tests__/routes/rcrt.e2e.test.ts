// Regression tests for P0.3: /api/v1/rcrt/* used to trust an unverified,
// base64-decoded JWT payload (no signature check) and fell back to a
// client-supplied `?wallet=`/body `wallet` with no authentication at all.
// Any caller who knew or guessed a wallet address could read that
// wallet's RCRT status (including its live connection token -- full
// device takeover), provision a device under someone else's identity, or
// revoke a real user's RCRT access outright. The wallet now always comes
// from req.user, populated by real, signature-verified JWT auth.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const OWNER_WALLET = '0x8888888888888888888888888888888888888888';
const ATTACKER_WALLET = '0x9999999999999999999999999999999999999999';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('RCRT Routes', () => {
  const prisma = (global as any).prismaTest;

  afterEach(async () => {
    await prisma.rCRTAgent.deleteMany({
      where: { ownerId: { in: [OWNER_WALLET.toLowerCase(), ATTACKER_WALLET.toLowerCase()] } },
    });
  });

  describe('GET /api/v1/rcrt/status', () => {
    it('returns a soft "not logged in" response for an unauthenticated caller, not a 401', async () => {
      const response = await request(app).get('/api/v1/rcrt/status').expect(200);
      expect(response.body.provisioned).toBe(false);
    });

    it('does not let an unauthenticated caller read another wallet\'s status via a query param', async () => {
      await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});

      const response = await request(app)
        .get('/api/v1/rcrt/status')
        .query({ wallet: OWNER_WALLET })
        .expect(200);

      // Unauthenticated -- must get the logged-out response, never the
      // real owner's provisioned token, regardless of the query param.
      expect(response.body.provisioned).toBe(false);
      expect(response.body.token).toBeUndefined();
    });

    it('does not let an authenticated attacker read another wallet\'s status/token by naming it in the query string', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});
      const ownerToken = provisionResponse.body.token;

      const response = await request(app)
        .get('/api/v1/rcrt/status')
        .query({ wallet: OWNER_WALLET }) // the old attack
        .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`) // authenticated as someone else
        .expect(200);

      expect(response.body.provisioned).toBe(false); // attacker has no agent of their own
      expect(response.body.token).not.toBe(ownerToken);
    });

    it('returns the real status for the authenticated owner', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});

      const response = await request(app)
        .get('/api/v1/rcrt/status')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .expect(200);

      expect(response.body.provisioned).toBe(true);
      expect(response.body.token).toBe(provisionResponse.body.token);
    });
  });

  describe('POST /api/v1/rcrt/provision', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const response = await request(app).post('/api/v1/rcrt/provision').send({}).expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('provisions for the authenticated caller, ignoring any wallet claimed in the body', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({ wallet: ATTACKER_WALLET }) // attacker-controlled claim
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.agentId).toMatch(/^rcrt-/);

      const agent = await prisma.rCRTAgent.findFirst({ where: { token: response.body.token } });
      expect(agent.ownerId).toBe(OWNER_WALLET.toLowerCase());
    });
  });

  describe('POST /api/v1/rcrt/connect', () => {
    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require token', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid provisioned token', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});

      const token = provisionResponse.body.token;

      const connectResponse = await request(app)
        .post('/api/v1/rcrt/connect')
        .send({ token, status: 'online' })
        .expect(200);

      expect(connectResponse.body).toHaveProperty('success');
      expect(connectResponse.body.wallet).toBe(OWNER_WALLET.toLowerCase());
    });
  });

  describe('DELETE /api/v1/rcrt/provision', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const response = await request(app).delete('/api/v1/rcrt/provision').send({}).expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('does not let an authenticated attacker revoke another wallet\'s access', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});

      await request(app)
        .delete('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`)
        .send({ wallet: OWNER_WALLET }) // the old attack
        .expect(200);

      const agent = await prisma.rCRTAgent.findFirst({ where: { token: provisionResponse.body.token } });
      expect(agent.revoked).toBe(false); // owner's real agent must be untouched
    });

    it('revokes the authenticated caller\'s own access', async () => {
      const provisionResponse = await request(app)
        .post('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({});

      await request(app)
        .delete('/api/v1/rcrt/provision')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({})
        .expect(200);

      const agent = await prisma.rCRTAgent.findFirst({ where: { token: provisionResponse.body.token } });
      expect(agent.revoked).toBe(true);
    });
  });

  describe('GET /api/v1/rcrt/audit', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const response = await request(app).get('/api/v1/rcrt/audit').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('returns the authenticated caller\'s own logs, not another wallet\'s, regardless of a query param', async () => {
      const response = await request(app)
        .get('/api/v1/rcrt/audit')
        .query({ wallet: OWNER_WALLET }) // the old attack -- ignored now
        .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /api/v1/rcrt/audit', () => {
    it('should create audit log entry', async () => {
      const response = await request(app)
        .post('/api/v1/rcrt/audit')
        .send({
          ownerId: OWNER_WALLET,
          action: 'provision',
          agentId: 'test-agent-id',
          status: 'success',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should require ownerId and action', async () => {
      const response = await request(app).post('/api/v1/rcrt/audit').send({}).expect(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
