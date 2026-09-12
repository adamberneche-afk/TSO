// Agent Marketplace (docs/DOCS_VS_CODEBASE.md row 22) is data-model-only
// so far -- no routes, no moderation, no UI, no browse page (see
// docs/AGENT_MARKETPLACE_DATA_MODEL.md). This test doesn't exercise any
// business logic (there isn't any yet); it proves the Prisma schema
// itself -- AgentListing's one-per-configuration uniqueness and its
// Cascade-on-configuration-delete behavior -- is mechanically sound.

import { randomUUID } from 'crypto';

describe('Agent Marketplace data model (AgentListing)', () => {
  const prisma = (global as any).prismaTest;
  const configIds: string[] = [];

  afterEach(async () => {
    if (configIds.length) {
      // Deleting the configuration cascades to its listing, so this alone
      // cleans up both rows -- exercised directly in its own test below.
      await prisma.agentConfiguration.deleteMany({ where: { id: { in: configIds } } });
      configIds.length = 0;
    }
  });

  async function createConfig(walletAddress: string) {
    const config = await prisma.agentConfiguration.create({
      data: {
        walletAddress,
        nftTokenId: `token-${randomUUID().slice(0, 8)}`,
        nftContractAddress: '0x9999999999999999999999999999999999999999',
        verifiedAt: new Date(),
        name: 'My Agent',
        configData: { skills: [] },
      },
    });
    configIds.push(config.id);
    return config;
  }

  it('lists an agent configuration with a curated public summary, defaulting to PENDING', async () => {
    const wallet = '0x1111111111111111111111111111111111111111';
    const config = await createConfig(wallet);

    const listing = await prisma.agentListing.create({
      data: {
        configurationId: config.id,
        walletAddress: wallet,
        name: 'Research Assistant',
        description: 'Helps summarize papers',
        category: 'productivity',
      },
    });

    expect(listing.status).toBe('PENDING');
    expect(listing.installCount).toBe(0);

    const found = await prisma.agentListing.findUnique({ where: { configurationId: config.id } });
    expect(found).not.toBeNull();
    expect(found.name).toBe('Research Assistant');
  });

  it('enforces one listing per configuration', async () => {
    const wallet = '0x2222222222222222222222222222222222222222';
    const config = await createConfig(wallet);

    await prisma.agentListing.create({
      data: { configurationId: config.id, walletAddress: wallet, name: 'Listing One' },
    });

    await expect(
      prisma.agentListing.create({
        data: { configurationId: config.id, walletAddress: wallet, name: 'Listing Two' },
      })
    ).rejects.toThrow();
  });

  it('Cascade on configuration delete: removing the configuration removes its listing', async () => {
    const wallet = '0x3333333333333333333333333333333333333333';
    const config = await createConfig(wallet);
    await prisma.agentListing.create({
      data: { configurationId: config.id, walletAddress: wallet, name: 'Doomed Listing' },
    });

    await prisma.agentConfiguration.delete({ where: { id: config.id } });
    configIds.length = 0; // already deleted -- afterEach shouldn't try again

    const survived = await prisma.agentListing.findUnique({ where: { configurationId: config.id } });
    expect(survived).toBeNull();
  });

  it('can be filtered by moderation status, mirroring the Skill status pattern', async () => {
    const wallet = '0x4444444444444444444444444444444444444444';
    const config = await createConfig(wallet);
    const listing = await prisma.agentListing.create({
      data: { configurationId: config.id, walletAddress: wallet, name: 'Approved Agent', status: 'APPROVED' },
    });

    const approved = await prisma.agentListing.findMany({ where: { status: 'APPROVED', id: listing.id } });
    expect(approved).toHaveLength(1);

    const pending = await prisma.agentListing.findMany({ where: { status: 'PENDING', id: listing.id } });
    expect(pending).toHaveLength(0);
  });
});
