import type { PrismaConfig } from 'prisma'

/**
 * BLOCKER-2 FIX: Prisma 7.x Configuration
 * Modern Prisma configuration file
 */

export default {
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    adapter: {
      type: 'postgresql',
      url: process.env.DATABASE_URL as string,
    },
  },
} satisfies PrismaConfig
