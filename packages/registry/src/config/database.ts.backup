/**
 * Database Configuration
 * Manages separate Prisma clients for RAG and Skills databases
 */

import { PrismaClient } from '@prisma/client';

// RAG Database Client (tais-rag)
export const createRAGPrismaClient = (logger?: any): PrismaClient => {
  const databaseUrl = process.env.RAG_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('RAG_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  if (logger) {
    logger.info('Creating RAG Prisma client');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// Skills/Registry Database Client (tais_registry)
export const createSkillsPrismaClient = (logger?: any): PrismaClient => {
  const databaseUrl = process.env.SKILLS_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('SKILLS_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  if (logger) {
    logger.info('Creating Skills Prisma client');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// Legacy: Single client for backward compatibility
export const createPrismaClient = (logger?: any): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
};

// Connection management
export const connectPrisma = async (prisma: PrismaClient, logger?: any): Promise<void> => {
  try {
    await prisma.$connect();
    if (logger) {
      logger.info('✅ Database connected successfully');
    }
  } catch (error) {
    if (logger) {
      logger.error('❌ Failed to connect to database:', error);
    }
    throw error;
  }
};

export const disconnectPrisma = async (prisma: PrismaClient, logger?: any): Promise<void> => {
  try {
    await prisma.$disconnect();
    if (logger) {
      logger.info('✅ Database disconnected');
    }
  } catch (error) {
    if (logger) {
      logger.error('❌ Error disconnecting from database:', error);
    }
  }
};

export default {
  createRAGPrismaClient,
  createSkillsPrismaClient,
  createPrismaClient,
  connectPrisma,
  disconnectPrisma,
};
