// Agent Marketplace (docs/DOCS_VS_CODEBASE.md row 22, see
// docs/AGENT_MARKETPLACE_DATA_MODEL.md for the data model this builds
// on): browse/create/moderate/install, end to end. Before this, the
// AgentListing model was real and migrated but had no routes, no
// moderation, and no install flow at all.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'crypto';

// routes/agentListings.ts's /install imports saveConfiguration from a
// different module, so mocking it here (unlike jest.spyOn, which can't
// intercept genesisConfigLimits.ts's own internal, same-file call chain
// canCreateConfiguration -> verifyNFTOwnership -- see
// oauth.e2e.test.ts's NFT spy, which works only because *that* call
// crosses a module boundary) replaces what agentListings.ts actually
// calls. This test isn't re-proving genesisConfigLimits' own NFT/tier
// logic (that's its own module's concern); it's proving /install calls
// saveConfiguration with the right derived arguments and does the right
// thing with the result.
jest.mock('../../services/genesisConfigLimits', () => ({
  ...jest.requireActual('../../services/genesisConfigLimits'),
  saveConfiguration: jest.fn(),
}));

import * as genesisConfigLimits from '../../services/genesisConfigLimits';
import app from '../../index';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESSES!.split(',')[0];

// A fresh, valid-format (40 hex chars) test wallet address -- randomUUID()
// alone only yields 32 hex chars, one hex short of a real address, so it
// fails the `0x[a-fA-F0-9]{40}` format check every wallet-keyed route uses.
function randomWallet(): string {
  return `0x${randomBytes(20).toString('hex')}`;
}

function walletToken(walletAddress: string): string {
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe('Agent Marketplace: browse, create, moderate, install', () => {
  const prisma = (global as any).prismaTest;
  const configIds: string[] = [];

  beforeEach(() => {
    (genesisConfigLimits.saveConfiguration as jest.Mock).mockClear();
  });

  afterAll(async () => {
    if (configIds.length) {
      // Deleting the configuration cascades to its listing.
      await prisma.agentConfiguration.deleteMany({ where: { id: { in: configIds } } });
    }
  });

  async function createConfig(walletAddress: string) {
    const config = await prisma.agentConfiguration.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        nftTokenId: `token-${randomUUID().slice(0, 8)}`,
        nftContractAddress: '0x9999999999999999999999999999999999999999',
        verifiedAt: new Date(),
        name: 'My Agent',
        configData: { skills: ['research'] },
        personalityMd: 'Be concise.',
      },
    });
    configIds.push(config.id);
    return config;
  }

  it('creates a listing only for the caller\'s own configuration', async () => {
    const owner = randomWallet();
    const stranger = randomWallet();
    const config = await createConfig(owner);

    const strangerAttempt = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(stranger)}`)
      .send({ configurationId: config.id, name: 'Stolen Listing' });
    expect(strangerAttempt.status).toBe(403);

    const ownerAttempt = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Research Assistant', description: 'Summarizes papers', category: 'productivity' })
      .expect(201);
    expect(ownerAttempt.body).toMatchObject({ name: 'Research Assistant', status: 'PENDING', installCount: 0 });

    // One listing per configuration.
    const duplicate = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Second Attempt' });
    expect(duplicate.status).toBe(409);
  });

  it('excludes PENDING listings from public browse, but the owner can still see it', async () => {
    const owner = randomWallet();
    const config = await createConfig(owner);
    const created = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Hidden Until Approved' })
      .expect(201);
    const listingId = created.body.id;

    const publicBrowse = await request(app).get('/api/v1/agent-listings');
    expect(publicBrowse.body.listings.map((l: any) => l.id)).not.toContain(listingId);

    // Public GET by id 404s for a non-approved listing to a stranger...
    const strangerView = await request(app).get(`/api/v1/agent-listings/${listingId}`);
    expect(strangerView.status).toBe(404);

    // ...but the owner can see it via GET /:id...
    const ownerView = await request(app)
      .get(`/api/v1/agent-listings/${listingId}`)
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .expect(200);
    expect(ownerView.body.status).toBe('PENDING');

    // ...and via GET /mine.
    const mine = await request(app)
      .get('/api/v1/agent-listings/mine')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .expect(200);
    expect(mine.body.map((l: any) => l.id)).toContain(listingId);
  });

  it('moves through the full moderation lifecycle: approve makes it public, suspend pulls it back, reject blocks re-approval of the same verdict', async () => {
    const owner = randomWallet();
    const config = await createConfig(owner);
    const created = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Moderation Test Agent' })
      .expect(201);
    const listingId = created.body.id;

    // Non-admin cannot moderate.
    await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ reason: 'trying to self-approve' })
      .expect(403);

    // The admin moderation queue shows it while PENDING (a non-admin
    // can't see the queue at all).
    await request(app)
      .get('/api/v1/admin/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .expect(403);
    const queue = await request(app)
      .get('/api/v1/admin/agent-listings')
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .expect(200);
    expect(queue.body.listings.map((l: any) => l.id)).toContain(listingId);

    // Admin approves.
    await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ reason: 'Looks good' })
      .expect(200);

    const afterApproval = await request(app).get('/api/v1/agent-listings');
    expect(afterApproval.body.listings.map((l: any) => l.id)).toContain(listingId);

    // Can't suspend something that isn't approved (guard already covered
    // by re-approve below); suspend the now-approved listing.
    await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/suspend`)
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ reason: 'Reported after the fact' })
      .expect(200);

    const afterSuspension = await request(app).get('/api/v1/agent-listings');
    expect(afterSuspension.body.listings.map((l: any) => l.id)).not.toContain(listingId);

    // A suspended listing can't be suspended again (guard: only APPROVED -> SUSPENDED).
    const doubleSuspend = await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/suspend`)
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ reason: 'again' });
    expect(doubleSuspend.status).toBe(409);
  });

  it('editing a listing sends it back to PENDING for re-review', async () => {
    const owner = randomWallet();
    const config = await createConfig(owner);
    const created = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Edit Me' })
      .expect(201);
    const listingId = created.body.id;

    await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ reason: 'ok' })
      .expect(200);

    const updated = await request(app)
      .put(`/api/v1/agent-listings/${listingId}`)
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ description: 'A meaningfully different pitch' })
      .expect(200);
    expect(updated.body.status).toBe('PENDING');

    // No longer publicly visible until re-approved.
    const browse = await request(app).get('/api/v1/agent-listings');
    expect(browse.body.listings.map((l: any) => l.id)).not.toContain(listingId);

    // A stranger cannot edit or withdraw someone else's listing.
    const stranger = randomWallet();
    await request(app)
      .put(`/api/v1/agent-listings/${listingId}`)
      .set('Authorization', `Bearer ${walletToken(stranger)}`)
      .send({ name: 'Hijacked' })
      .expect(403);
    await request(app)
      .delete(`/api/v1/agent-listings/${listingId}`)
      .set('Authorization', `Bearer ${walletToken(stranger)}`)
      .expect(403);

    // The owner can withdraw it.
    await request(app)
      .delete(`/api/v1/agent-listings/${listingId}`)
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .expect(204);

    const gone = await prisma.agentListing.findUnique({ where: { id: listingId } });
    expect(gone).toBeNull();
    // Withdrawing the listing must not touch the underlying configuration.
    const configStillExists = await prisma.agentConfiguration.findUnique({ where: { id: config.id } });
    expect(configStillExists).not.toBeNull();
  });

  it('installs an approved listing into the installer\'s own configuration and increments installCount', async () => {
    const owner = randomWallet();
    const installer = randomWallet();
    const config = await createConfig(owner);
    const created = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Installable Agent', description: 'desc' })
      .expect(201);
    const listingId = created.body.id;

    // Not installable while PENDING.
    const tooEarly = await request(app)
      .post(`/api/v1/agent-listings/${listingId}/install`)
      .set('Authorization', `Bearer ${walletToken(installer)}`);
    expect(tooEarly.status).toBe(404);

    await request(app)
      .post(`/api/v1/admin/agent-listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ reason: 'ok' })
      .expect(200);

    // saveConfiguration (imported into routes/agentListings.ts from a
    // different module) is mocked at the top of this file -- see that
    // comment for why a jest.spyOn on verifyNFTOwnership, as
    // oauth.e2e.test.ts uses, can't intercept this particular call chain.
    const fakeConfig = { id: randomUUID(), walletAddress: installer.toLowerCase(), name: 'Installable Agent' };
    (genesisConfigLimits.saveConfiguration as jest.Mock).mockResolvedValue({ config: fakeConfig, remaining: 1, limit: 2 });

    const installResponse = await request(app)
      .post(`/api/v1/agent-listings/${listingId}/install`)
      .set('Authorization', `Bearer ${walletToken(installer)}`)
      .expect(201);

    expect(installResponse.body.configuration).toEqual(fakeConfig);
    // Proves /install derives its saveConfiguration call from the
    // listing's own curated fields and the underlying configuration's
    // real (private) configData/personalityMd -- not from anything the
    // caller supplied.
    expect(genesisConfigLimits.saveConfiguration).toHaveBeenCalledWith(
      installer,
      'Installable Agent',
      { skills: ['research'] },
      'desc',
      'Be concise.'
    );

    const listingAfter = await prisma.agentListing.findUnique({ where: { id: listingId } });
    expect(listingAfter.installCount).toBe(1);
  });

  it('does not let a listing be installed while PENDING, even for a stranger who is not the owner', async () => {
    const owner = randomWallet();
    const installer = randomWallet();
    const config = await createConfig(owner);
    const created = await request(app)
      .post('/api/v1/agent-listings')
      .set('Authorization', `Bearer ${walletToken(owner)}`)
      .send({ configurationId: config.id, name: 'Not Yet Approved' })
      .expect(201);

    const response = await request(app)
      .post(`/api/v1/agent-listings/${created.body.id}/install`)
      .set('Authorization', `Bearer ${walletToken(installer)}`);
    expect(response.status).toBe(404);
    expect(genesisConfigLimits.saveConfiguration).not.toHaveBeenCalled();
  });
});
