import { PrismaClient } from '@prisma/client';
import { app } from '../index';
import request from 'supertest';

// Test database client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tais_registry_test',
    },
  },
});

// Global test utilities
declare global {
  var prismaTest: PrismaClient;
  var requestTest: typeof request;
}

global.prismaTest = prisma;
global.requestTest = request;

// Setup before all tests
beforeAll(async () => {
  // Clean database before tests
  await cleanDatabase();
});

// Cleanup after each test
afterEach(async () => {
  await cleanDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Helper to clean database
async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.log(`Error cleaning ${tablename}:`, error);
      }
    }
  }
}

// Export for use in tests
export { prisma };