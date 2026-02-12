import type { PrismaConfig } from 'prisma'

/**
 * BLOCKER-2 FIX: Prisma 7.x Configuration
 * Modern Prisma configuration file
 */

export default {
  earlyAccess: true,
  schema: './prisma/schema.prisma',
} satisfies PrismaConfig
