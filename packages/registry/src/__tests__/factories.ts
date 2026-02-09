import { PrismaClient, Skill, Audit, Category, Tag } from '@prisma/client';

const prisma = new PrismaClient();

// Test data factories
export const createSkill = async (overrides: Partial<Skill> = {}): Promise<Skill> => {
  const defaultSkill = {
    skillHash: `hash_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: 'Test Skill',
    version: '1.0.0',
    description: 'A test skill for unit testing',
    author: '0x1234567890123456789012345678901234567890',
    manifestCid: 'QmTestManifestCid123',
    packageCid: 'QmTestPackageCid456',
    permissions: {
      network: { domains: ['api.example.com'] },
      filesystem: { read: ['/tmp'], write: [] },
      env_vars: [],
      modules: ['axios'],
    },
    trustScore: 0.75,
    downloadCount: 0,
    status: 'APPROVED' as const,
    isBlocked: false,
  };

  return await prisma.skill.create({
    data: { ...defaultSkill, ...overrides },
  });
};

export const createAudit = async (skillId: string, overrides: Partial<Audit> = {}): Promise<Audit> => {
  const defaultAudit = {
    skillId,
    auditor: '0x9876543210987654321098765432109876543210',
    auditorNft: 'nft_123',
    status: 'SAFE' as const,
    findings: [],
    signature: '0x' + 'a'.repeat(130),
  };

  return await prisma.audit.create({
    data: { ...defaultAudit, ...overrides },
  });
};

export const createCategory = async (overrides: Partial<Category> = {}): Promise<Category> => {
  const defaultCategory = {
    name: `category_${Date.now()}`,
    description: 'Test category',
  };

  return await prisma.category.create({
    data: { ...defaultCategory, ...overrides },
  });
};

export const createTag = async (overrides: Partial<Tag> = {}): Promise<Tag> => {
  const defaultTag = {
    name: `tag_${Date.now()}`,
  };

  return await prisma.tag.create({
    data: { ...defaultTag, ...overrides },
  });
};

// Helper to create a skill with related data
export const createSkillWithRelations = async (overrides: Partial<Skill> = {}) => {
  const skill = await createSkill(overrides);
  const category = await createCategory();
  const tag = await createTag();
  const audit = await createAudit(skill.id);

  // Link relations
  await prisma.skillCategory.create({
    data: {
      skillId: skill.id,
      categoryId: category.id,
    },
  });

  await prisma.skillTag.create({
    data: {
      skillId: skill.id,
      tagId: tag.id,
    },
  });

  return {
    skill,
    category,
    tag,
    audit,
  };
};

// Generate test skill hash
export const generateSkillHash = (): string => {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// Generate test wallet address
export const generateWalletAddress = (): string => {
  return '0x' + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};