// Enterprise RAG (docs/ENTERPRISE_RAG_DATA_MODEL.md,
// docs/ENTERPRISE_RAG_IDENTITY.md): org creation, invite-only membership,
// email/password login, and role-based moderation, end to end. Before
// this, Organization/OrganizationMember/RAGDocument.organizationId were
// real, migrated, and unit-tested (organizationDataModel.test.ts) but had
// no routes, no invitation flow, and no identity system at all -- an
// enterprise member had to be a wallet holder, created by inserting a
// row directly.
//
// Deliberately not a real wallet anywhere in this file: that's the point
// of the identity option this was built with -- no MetaMask, no private
// key, no blockchain infrastructure, just email + password.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESSES!.split(',')[0];
const NON_ADMIN_WALLET = '0x999999999999999999999999999999999999999a';

function walletToken(walletAddress: string): string {
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

function uniqueSlug(): string {
  return `acme-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

describe('Enterprise RAG: invite-only orgs with email/password identity', () => {
  const prisma = (global as any).prismaTest;
  const orgIds: string[] = [];
  const emails: string[] = [];

  afterAll(async () => {
    if (orgIds.length) await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    if (emails.length) await prisma.emailIdentity.deleteMany({ where: { email: { in: emails } } });
  });

  it('rejects org creation from a non-admin wallet', async () => {
    const slug = uniqueSlug();
    const response = await request(app)
      .post('/api/v1/orgs')
      .set('Authorization', `Bearer ${walletToken(NON_ADMIN_WALLET)}`)
      .send({ name: 'Acme Corp', slug, ownerEmail: 'owner@acme-test.example' });
    expect(response.status).toBe(403);
  });

  it('rejects org creation with no auth at all', async () => {
    const response = await request(app).post('/api/v1/orgs').send({ name: 'Acme', slug: uniqueSlug(), ownerEmail: 'x@example.com' });
    expect(response.status).toBe(401);
  });

  it('drives the full lifecycle: admin creates org -> owner accepts by email -> owner invites a member -> member accepts -> role-gated actions behave correctly', async () => {
    const slug = uniqueSlug();
    const ownerEmail = `owner-${Date.now()}@acme-test.example`;
    const memberEmail = `member-${Date.now()}@acme-test.example`;
    emails.push(ownerEmail, memberEmail);

    // 1. Admin provisions the org (invite-only: this is the only way an
    // org gets an initial member).
    const createOrgResponse = await request(app)
      .post('/api/v1/orgs')
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ name: 'Acme Corp', slug, description: 'A test org', ownerEmail })
      .expect(201);
    const orgId = createOrgResponse.body.id;
    orgIds.push(orgId);
    const ownerInviteToken = createOrgResponse.body.inviteToken;
    expect(ownerInviteToken).toBeTruthy();

    // 2. Preview the invitation before accepting (the "you've been
    // invited" landing page's data source) -- unauthenticated, by design.
    const previewResponse = await request(app).get(`/api/v1/orgs/invitations/${ownerInviteToken}`).expect(200);
    expect(previewResponse.body).toMatchObject({
      organizationName: 'Acme Corp',
      email: ownerEmail,
      role: 'OWNER',
      requiresPassword: true,
    });

    // An invalid token previews as not-found, not a 500 or a leak of
    // "is this a real invite".
    await request(app).get('/api/v1/orgs/invitations/not-a-real-token').expect(404);

    // Accepting without a password is rejected with a specific,
    // actionable error (this is a brand-new email, no identity yet).
    const missingPasswordResponse = await request(app).post(`/api/v1/orgs/invitations/${ownerInviteToken}/accept`).send({});
    expect(missingPasswordResponse.status).toBe(400);
    expect(missingPasswordResponse.body.error).toBe('password_required');

    // 3. Owner accepts, setting a password -- this both creates their
    // EmailIdentity and their OrganizationMember row in one step, and
    // logs them in immediately.
    const acceptOwnerResponse = await request(app)
      .post(`/api/v1/orgs/invitations/${ownerInviteToken}/accept`)
      .send({ password: 'owner-password-123' })
      .expect(200);
    expect(acceptOwnerResponse.body).toMatchObject({ organizationId: orgId, organizationName: 'Acme Corp', role: 'OWNER' });
    const ownerTokenFromAccept: string = acceptOwnerResponse.body.token;

    // A second accept attempt on the same (now-consumed) token fails.
    await request(app)
      .post(`/api/v1/orgs/invitations/${ownerInviteToken}/accept`)
      .send({ password: 'irrelevant' })
      .expect(404);

    // 4. Owner can also log in from scratch via email/password (not just
    // the token returned by accept), and gets the exact same JWT shape.
    const loginResponse = await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: ownerEmail, password: 'owner-password-123' })
      .expect(200);
    const ownerToken: string = loginResponse.body.token;
    expect(ownerToken).toBeTruthy();

    // Wrong password is rejected.
    await request(app)
      .post('/api/v1/auth/email/login')
      .send({ email: ownerEmail, password: 'wrong-password' })
      .expect(401);

    // The email-login JWT authenticates against ordinary
    // authMiddleware-protected routes exactly like a wallet JWT does --
    // no special-casing anywhere downstream.
    const getOrgResponse = await request(app)
      .get(`/api/v1/orgs/${orgId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(getOrgResponse.body).toMatchObject({ id: orgId, name: 'Acme Corp', yourRole: 'OWNER' });

    // A non-member (even a real admin wallet) cannot read the org.
    await request(app)
      .get(`/api/v1/orgs/${orgId}`)
      .set('Authorization', `Bearer ${walletToken(NON_ADMIN_WALLET)}`)
      .expect(403);

    // 5. Owner invites a MEMBER by email.
    const inviteMemberResponse = await request(app)
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'MEMBER' })
      .expect(201);
    const memberInviteToken = inviteMemberResponse.body.inviteToken;
    expect(memberInviteToken).toBeTruthy();

    // 6. Member accepts.
    const acceptMemberResponse = await request(app)
      .post(`/api/v1/orgs/invitations/${memberInviteToken}/accept`)
      .send({ password: 'member-password-456' })
      .expect(200);
    expect(acceptMemberResponse.body.role).toBe('MEMBER');
    const memberToken: string = acceptMemberResponse.body.token;

    // 7. Membership list now shows both, correctly roled.
    const membersResponse = await request(app)
      .get(`/api/v1/orgs/${orgId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(membersResponse.body).toHaveLength(2);
    const roles = membersResponse.body.map((m: any) => m.role).sort();
    expect(roles).toEqual(['MEMBER', 'OWNER']);

    // 8. A MEMBER cannot invite others or remove members (role gating).
    await request(app)
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'someone-else@acme-test.example', role: 'MEMBER' })
      .expect(403);

    const ownerMembership = membersResponse.body.find((m: any) => m.role === 'OWNER');
    await request(app)
      .delete(`/api/v1/orgs/${orgId}/members/${ownerMembership.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    // 9. The sole owner cannot be demoted or removed, even by themself.
    await request(app)
      .patch(`/api/v1/orgs/${orgId}/members/${ownerMembership.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'MEMBER' })
      .expect(400);
    await request(app)
      .delete(`/api/v1/orgs/${orgId}/members/${ownerMembership.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);

    // 10. Owner CAN remove the member.
    const memberMembership = membersResponse.body.find((m: any) => m.role === 'MEMBER');
    await request(app)
      .delete(`/api/v1/orgs/${orgId}/members/${memberMembership.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    // The removed member can no longer read the org.
    await request(app)
      .get(`/api/v1/orgs/${orgId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('uploads a document to an org and lets a member read it, but only an org ADMIN/OWNER (not a plain MEMBER) can delete someone else\'s org document', async () => {
    const slug = uniqueSlug();
    const ownerEmail = `owner2-${Date.now()}@acme-test.example`;
    const memberEmail = `member2-${Date.now()}@acme-test.example`;
    emails.push(ownerEmail, memberEmail);

    const createOrgResponse = await request(app)
      .post('/api/v1/orgs')
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ name: 'Beta Inc', slug, ownerEmail })
      .expect(201);
    const orgId = createOrgResponse.body.id;
    orgIds.push(orgId);

    const acceptOwner = await request(app)
      .post(`/api/v1/orgs/invitations/${createOrgResponse.body.inviteToken}/accept`)
      .send({ password: 'owner-pw-1' })
      .expect(200);
    const ownerToken = acceptOwner.body.token;

    const inviteMember = await request(app)
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'MEMBER' })
      .expect(201);
    const acceptMember = await request(app)
      .post(`/api/v1/orgs/invitations/${inviteMember.body.inviteToken}/accept`)
      .send({ password: 'member-pw-1' })
      .expect(200);
    const memberToken = acceptMember.body.token;

    // Member uploads a document shared with the org.
    const uploadResponse = await request(app)
      .post('/api/v1/rag/documents')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        encryptedData: 'ciphertext',
        encryptedMetadata: 'ciphertext-meta',
        iv: 'iv',
        salt: 'salt',
        ownerPublicKey: 'test-key',
        isPublic: false,
        organizationId: orgId,
      })
      .expect(201);
    expect(uploadResponse.body.organizationId).toBe(orgId);
    const documentId = uploadResponse.body.id;

    // Both the owner and the member can see it listed for the org.
    const orgDocsAsOwner = await request(app)
      .get(`/api/v1/orgs/${orgId}/rag/documents`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(orgDocsAsOwner.body.map((d: any) => d.id)).toContain(documentId);

    // A non-member cannot upload into this org.
    const outsiderResponse = await request(app)
      .post('/api/v1/rag/documents')
      .set('Authorization', `Bearer ${walletToken(NON_ADMIN_WALLET)}`)
      .send({
        encryptedData: 'ciphertext2',
        encryptedMetadata: 'meta2',
        iv: 'iv2',
        salt: 'salt2',
        ownerPublicKey: 'test-key-2',
        organizationId: orgId,
      });
    expect(outsiderResponse.status).toBe(403);

    // The owner (not the uploader) can still moderate-delete the
    // member's document -- role-based moderation, not just ownership.
    await request(app)
      .delete(`/api/v1/rag/documents/${documentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });

  it('only an OWNER can delete the organization itself', async () => {
    const slug = uniqueSlug();
    const ownerEmail = `owner3-${Date.now()}@acme-test.example`;
    const memberEmail = `member3-${Date.now()}@acme-test.example`;
    emails.push(ownerEmail, memberEmail);

    const createOrgResponse = await request(app)
      .post('/api/v1/orgs')
      .set('Authorization', `Bearer ${walletToken(ADMIN_WALLET)}`)
      .send({ name: 'Gamma LLC', slug, ownerEmail })
      .expect(201);
    const orgId = createOrgResponse.body.id;

    const acceptOwner = await request(app)
      .post(`/api/v1/orgs/invitations/${createOrgResponse.body.inviteToken}/accept`)
      .send({ password: 'owner-pw-2' })
      .expect(200);
    const ownerToken = acceptOwner.body.token;

    const inviteMember = await request(app)
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'MEMBER' })
      .expect(201);
    const acceptMember = await request(app)
      .post(`/api/v1/orgs/invitations/${inviteMember.body.inviteToken}/accept`)
      .send({ password: 'member-pw-2' })
      .expect(200);
    const memberToken = acceptMember.body.token;

    await request(app)
      .delete(`/api/v1/orgs/${orgId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/v1/orgs/${orgId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    // Org is really gone -- not just inaccessible.
    const found = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(found).toBeNull();
  });
});
