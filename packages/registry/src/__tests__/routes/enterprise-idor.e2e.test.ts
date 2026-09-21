// Regression test for the IDOR on GET /enterprise/organization/:orgId.
//
// The route checked `org.adminWalletAddress !== wallet.toLowerCase()`
// where `wallet` came from `req.query` -- entirely client-controlled and
// never checked against `req.user.walletAddress` (the actual
// authenticated identity, populated by authMiddleware). Any
// authenticated caller could view any organization's data just by
// passing that organization's real admin wallet in the query string,
// without proving they control it -- they never needed to.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import app from '../../index';

const ORG_ADMIN_WALLET = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72';
const ATTACKER_WALLET = '0x1111111111111111111111111111111111111111';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('GET /enterprise/organization/:orgId IDOR', () => {
  const prisma = (global as any).prismaTest;
  const orgId = `test-org-${randomUUID()}`;

  beforeAll(async () => {
    await prisma.agentAppOrganization.create({
      data: {
        orgId,
        name: 'Victim Org',
        adminWalletAddress: ORG_ADMIN_WALLET.toLowerCase(),
        approvedApps: ['secret-app-1'],
        blockedApps: [],
        requireApprovalFor: [],
      },
    });
  });

  afterAll(async () => {
    await prisma.agentAppOrganization.deleteMany({ where: { orgId } });
  });

  it('does not let an unrelated authenticated user view another org by naming its admin wallet in the query string', async () => {
    const response = await request(app)
      .get(`/api/v1/enterprise/organization/${orgId}`)
      .query({ wallet: ORG_ADMIN_WALLET }) // the old attack: claim to be the admin via query param
      .set('Authorization', `Bearer ${authToken(ATTACKER_WALLET)}`); // but authenticate as someone else

    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty('approvedApps');
  });

  it('lets the real admin view their own organization', async () => {
    const response = await request(app)
      .get(`/api/v1/enterprise/organization/${orgId}`)
      .set('Authorization', `Bearer ${authToken(ORG_ADMIN_WALLET)}`);

    expect(response.status).toBe(200);
    expect(response.body.orgId).toBe(orgId);
    expect(response.body.approvedApps).toEqual(['secret-app-1']);
  });

  it('rejects an unauthenticated request outright', async () => {
    const response = await request(app).get(`/api/v1/enterprise/organization/${orgId}`);

    expect(response.status).toBe(401);
  });
});
