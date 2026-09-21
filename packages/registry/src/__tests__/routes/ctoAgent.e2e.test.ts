// Regression tests for mounting the CTO Agent API.
//
// createCTOAgentRoutes was never imported/mounted in index.ts at all, so
// /api/v1/cto/projects and /api/v1/cto/insights (both actively called by
// GoldTierDashboard.tsx in tais_frontend) 404'd for every real user.
//
// Mounting it exposed that every existing endpoint trusted a
// client-submitted `wallet` (or no wallet check at all) to decide whose
// projects to read/mutate -- an IDOR: any caller who knew or guessed a
// project id or another user's wallet address could read or edit that
// user's CTO projects, pain points, and blockers. Every handler now
// derives its wallet from the authenticated req.user and checks project
// ownership before any read or mutation.
//
// GET/POST /api/v1/cto/insights didn't exist anywhere at all despite a
// matching CTOInsight Prisma model already existing -- these are new.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const OWNER_WALLET = '0x6666666666666666666666666666666666666666';
const ATTACKER_WALLET = '0x7777777777777777777777777777777777777777';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('/api/v1/cto', () => {
  const prisma = (global as any).prismaTest;

  afterEach(async () => {
    await prisma.cTOAgentProject.deleteMany({
      where: { walletAddress: { in: [OWNER_WALLET.toLowerCase(), ATTACKER_WALLET.toLowerCase()] } },
    });
    await prisma.cTOInsight.deleteMany({
      where: { walletAddress: { in: [OWNER_WALLET.toLowerCase(), ATTACKER_WALLET.toLowerCase()] } },
    });
  });

  it('rejects unauthenticated requests to /projects', async () => {
    const response = await request(app).get('/api/v1/cto/projects');
    expect(response.status).toBe(401);
  });

  it('creates a project for the authenticated caller, ignoring any wallet claimed in the body', async () => {
    const response = await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ wallet: ATTACKER_WALLET, name: 'my-startup' });

    expect(response.status).toBe(201);
    expect(response.body.walletAddress).toBe(OWNER_WALLET.toLowerCase());
  });

  it('does not let an unrelated authenticated user list another wallet\'s projects via a query param', async () => {
    await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ name: 'owners-project' });

    const response = await request(app)
      .get('/api/v1/cto/projects')
      .query({ wallet: OWNER_WALLET })
      .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`);

    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([]);
  });

  it('does not let an unrelated authenticated user view another user\'s project by id', async () => {
    const created = await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ name: 'owners-project' });

    const response = await request(app)
      .get(`/api/v1/cto/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`);

    expect(response.status).toBe(403);
  });

  it('lets the real owner view their own project', async () => {
    const created = await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ name: 'owners-project' });

    const response = await request(app)
      .get(`/api/v1/cto/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
  });

  it('does not let an unrelated authenticated user add a pain point to another user\'s project', async () => {
    const created = await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ name: 'owners-project' });

    const response = await request(app)
      .post(`/api/v1/cto/projects/${created.body.id}/pain-points`)
      .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`)
      .send({ area: 'onboarding', description: 'injected by attacker' });

    expect(response.status).toBe(403);

    const project = await prisma.cTOAgentProject.findUnique({ where: { id: created.body.id } });
    expect(project.painPoints).toEqual([]);
  });

  it('lets the real owner update their project phase', async () => {
    const created = await request(app)
      .post('/api/v1/cto/projects')
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ name: 'owners-project' });

    const response = await request(app)
      .post(`/api/v1/cto/projects/${created.body.id}/phase`)
      .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
      .send({ phase: 'architecture' });

    expect(response.status).toBe(200);
    expect(response.body.currentPhase).toBe('architecture');
  });

  describe('/insights', () => {
    it('rejects an unauthenticated GET', async () => {
      const response = await request(app).get('/api/v1/cto/insights');
      expect(response.status).toBe(401);
    });

    it('creates an insight recording the authenticated wallet, then lists it', async () => {
      const createResponse = await request(app)
        .post('/api/v1/cto/insights')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({ title: 'Ship fast', content: 'Talk to users early.', category: 'lessons-learned' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.walletAddress).toBe(OWNER_WALLET.toLowerCase());

      const listResponse = await request(app)
        .get('/api/v1/cto/insights')
        .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.insights.some((i: any) => i.id === createResponse.body.id)).toBe(true);
    });

    it('rejects an invalid category', async () => {
      const response = await request(app)
        .post('/api/v1/cto/insights')
        .set('Authorization', `Bearer ${authToken(OWNER_WALLET)}`)
        .send({ title: 'x', content: 'y', category: 'not-a-real-category' });

      expect(response.status).toBe(400);
    });
  });
});
