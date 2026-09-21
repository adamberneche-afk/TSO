// Enterprise RAG (docs/DOCS_VS_CODEBASE.md row 14) is data-model-only so
// far -- no routes, no invitation flow, no UI (see
// docs/ENTERPRISE_RAG_DATA_MODEL.md). This test doesn't exercise any
// business logic (there isn't any yet); it proves the Prisma schema
// itself -- Organization / OrganizationMember / RAGDocument.organizationId
// -- is mechanically sound: real inserts, the unique membership
// constraint, and the SetNull-on-org-delete behavior the schema
// comments document all actually work as designed.

import { randomUUID } from 'crypto';

describe('Enterprise RAG data model (Organization / OrganizationMember)', () => {
  const prisma = (global as any).prismaTest;
  const orgIds: string[] = [];
  const docIds: string[] = [];

  afterEach(async () => {
    if (docIds.length) {
      await prisma.rAGDocument.deleteMany({ where: { id: { in: docIds } } });
      docIds.length = 0;
    }
    if (orgIds.length) {
      await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
      orgIds.length = 0;
    }
  });

  it('creates an organization with owner/admin/member roles and enforces one membership per wallet', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Acme Corp', slug: `acme-${randomUUID().slice(0, 8)}` },
    });
    orgIds.push(org.id);

    const owner = '0x1111111111111111111111111111111111111111';
    const admin = '0x2222222222222222222222222222222222222222';
    const member = '0x3333333333333333333333333333333333333333';

    await prisma.organizationMember.createMany({
      data: [
        { organizationId: org.id, walletAddress: owner, role: 'OWNER' },
        { organizationId: org.id, walletAddress: admin, role: 'ADMIN', invitedBy: owner },
        { organizationId: org.id, walletAddress: member, role: 'MEMBER', invitedBy: admin },
      ],
    });

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: org.id },
      orderBy: { role: 'asc' },
    });
    expect(members).toHaveLength(3);
    expect(members.map((m: any) => m.role).sort()).toEqual(['ADMIN', 'MEMBER', 'OWNER']);

    // A wallet can't join the same org twice.
    await expect(
      prisma.organizationMember.create({
        data: { organizationId: org.id, walletAddress: owner, role: 'MEMBER' },
      })
    ).rejects.toThrow();
  });

  it('shares an org-owned document with every member via organizationId, distinct from isPublic/allowedViewers', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Beta Inc', slug: `beta-${randomUUID().slice(0, 8)}` },
    });
    orgIds.push(org.id);

    const uploader = '0x4444444444444444444444444444444444444444';
    await prisma.organizationMember.create({
      data: { organizationId: org.id, walletAddress: uploader, role: 'MEMBER' },
    });

    const doc = await prisma.rAGDocument.create({
      data: {
        walletAddress: uploader,
        ownerPublicKey: 'test-key',
        encryptedData: 'ciphertext',
        encryptedMetadata: 'ciphertext-meta',
        iv: 'iv',
        salt: 'salt',
        isPublic: false, // org sharing is independent of the public/private flag
        organizationId: org.id,
        size: 10,
        chunkCount: 0,
      },
    });
    docIds.push(doc.id);

    const orgDocs = await prisma.rAGDocument.findMany({ where: { organizationId: org.id } });
    expect(orgDocs).toHaveLength(1);
    expect(orgDocs[0].isPublic).toBe(false);
  });

  it('SetNull on org delete: deleting an organization orphans its documents rather than deleting them', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Gamma LLC', slug: `gamma-${randomUUID().slice(0, 8)}` },
    });
    orgIds.push(org.id);

    const uploader = '0x5555555555555555555555555555555555555555';
    const doc = await prisma.rAGDocument.create({
      data: {
        walletAddress: uploader,
        ownerPublicKey: 'test-key',
        encryptedData: 'ciphertext',
        encryptedMetadata: 'ciphertext-meta',
        iv: 'iv',
        salt: 'salt',
        organizationId: org.id,
        size: 10,
        chunkCount: 0,
      },
    });
    docIds.push(doc.id);

    await prisma.organization.delete({ where: { id: org.id } });
    orgIds.length = 0; // already deleted -- afterEach shouldn't try again

    const survived = await prisma.rAGDocument.findUnique({ where: { id: doc.id } });
    expect(survived).not.toBeNull();
    expect(survived.organizationId).toBeNull();
  });

  it('Cascade on org delete: deleting an organization removes its memberships', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Delta Co', slug: `delta-${randomUUID().slice(0, 8)}` },
    });
    const wallet = '0x6666666666666666666666666666666666666666';
    await prisma.organizationMember.create({
      data: { organizationId: org.id, walletAddress: wallet, role: 'OWNER' },
    });

    await prisma.organization.delete({ where: { id: org.id } });

    const members = await prisma.organizationMember.findMany({ where: { organizationId: org.id } });
    expect(members).toHaveLength(0);
  });
});
