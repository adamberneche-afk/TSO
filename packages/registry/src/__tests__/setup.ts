import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../config/database';

let prisma: PrismaClient | null = null;

declare global {
  var prismaTest: PrismaClient | null;
}

if (process.env.TEST_DATABASE_URL) {
  prisma = createPrismaClient();
  global.prismaTest = prisma;
}

if (prisma) {
  afterAll(async () => {
    await prisma!.$disconnect();
  });
}
