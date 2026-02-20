import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

declare global {
  var prismaTest: PrismaClient | null;
}

if (process.env.TEST_DATABASE_URL) {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });
  global.prismaTest = prisma;
}

if (prisma) {
  afterAll(async () => {
    await prisma!.$disconnect();
  });
}
