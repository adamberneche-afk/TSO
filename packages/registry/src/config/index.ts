/**
 * Centralized Configuration Management
 * Provides clear, validated configuration for the TAIS platform
 */

import { z } from 'zod';

/**
 * Database Configuration Schema
 */
export const DatabaseConfigSchema = z.object({
  // Primary database URLs
  databaseUrl: z.string().url().optional(),
  ragDatabaseUrl: z.string().url().optional(),
  skillsDatabaseUrl: z.string().url().optional(),
});

/**
 * Server Configuration Schema
 */
export const ServerConfigSchema = z.object({
  port: z.string().default('3000'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  trustedProxies: z.string().optional().transform(val => val?.split(',').map(s => s.trim()) || []),
});

/**
 * Blockchain Configuration Schema
 */
export const BlockchainConfigSchema = z.object({
  rpcUrl: z.string().url().default('https://cloudflare-eth.com'),
  genesisContract: z.string().default(''),
  publisherNftAddress: z.string().optional(),
  auditorNftAddress: z.string().optional(),
});

/**
 * Security Configuration Schema
 */
export const SecurityConfigSchema = z.object({
  adminWalletAddresses: z.string().optional().transform(val => 
    val?.split(',').map(s => s.trim()).filter(Boolean) || []
  ),
  corsOrigin: z.string().optional().transform(val => 
    val?.split(',').map(s => s.trim()).filter(Boolean) || []
  ),
  rateLimitStandard: z.number().default('100'),
  rateLimitStrict: z.number().default('10'),
  rateLimitAuth: z.number().default('5'),
});

/**
 * Application Configuration
 */
export interface AppConfig {
  database: DatabaseConfig;
  server: ServerConfig;
  blockchain: BlockchainConfig;
  security: SecurityConfig;
}

/**
 * Database Configuration
 */
export interface DatabaseConfig {
  /** Main database URL (fallback) */
  databaseUrl: string | undefined;
  /** RAG database URL (for public documents) */
  ragDatabaseUrl: string | undefined;
  /** Skills database URL (for skills, auth, etc.) */
  skillsDatabaseUrl: string | undefined;
  /** Whether dual database mode is enabled */
  isDualDb: boolean;
  /** Effective RAG database URL to use */
  effectiveRagUrl: string;
  /** Effective Skills database URL to use */
  effectiveSkillsUrl: string;
}

/**
 * Server Configuration
 */
export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  trustedProxies: string[];
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

/**
 * Blockchain Configuration
 */
export interface BlockchainConfig {
  rpcUrl: string;
  genesisContract: string;
  publisherNftAddress: string | undefined;
  auditorNftAddress: string | undefined;
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  adminWalletAddresses: string[];
  corsOrigin: string[];
  rateLimitStandard: number;
  rateLimitStrict: number;
  rateLimitAuth: number;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  // Load and validate each configuration section
  const databaseRaw = DatabaseConfigSchema.parse({
    databaseUrl: process.env.DATABASE_URL,
    ragDatabaseUrl: process.env.RAG_DATABASE_URL,
    skillsDatabaseUrl: process.env.SKILLS_DATABASE_URL,
  });

  const serverRaw = ServerConfigSchema.parse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    trustedProxies: process.env.TRUSTED_PROXIES,
  });

  const blockchainRaw = BlockchainConfigSchema.parse({
    rpcUrl: process.env.RPC_URL,
    genesisContract: process.env.GENESIS_CONTRACT || '',
    publisherNftAddress: process.env.PUBLISHER_NFT_ADDRESS,
    auditorNftAddress: process.env.AUDITOR_NFT_ADDRESS,
  });

  const securityRaw = SecurityConfigSchema.parse({
    adminWalletAddresses: process.env.ADMIN_WALLET_ADDRESSES,
    corsOrigin: process.env.CORS_ORIGIN,
    rateLimitStandard: process.env.RATE_LIMIT_STANDARD,
    rateLimitStrict: process.env.RATE_LIMIT_STRICT,
    rateLimitAuth: process.env.RATE_LIMIT_AUTH,
  });

  // Process database configuration
  const isDualDb = !!databaseRaw.ragDatabaseUrl && !!databaseRaw.skillsDatabaseUrl;
  
  const database: DatabaseConfig = {
    databaseUrl: databaseRaw.databaseUrl,
    ragDatabaseUrl: databaseRaw.ragDatabaseUrl,
    skillsDatabaseUrl: databaseRaw.skillsDatabaseUrl,
    isDualDb,
    // Effective URLs - use specific URLs when available, fallback to main
    effectiveRagUrl: databaseRaw.ragDatabaseUrl || databaseRaw.databaseUrl || '',
    effectiveSkillsUrl: databaseRaw.skillsDatabaseUrl || databaseRaw.databaseUrl || '',
  };

  // Process server configuration
  const server: ServerConfig = {
    port: parseInt(serverRaw.port, 10),
    nodeEnv: serverRaw.nodeEnv,
    logLevel: serverRaw.logLevel,
    trustedProxies: serverRaw.trustedProxies,
    isProduction: serverRaw.nodeEnv === 'production',
    isDevelopment: serverRaw.nodeEnv === 'development',
    isTest: serverRaw.nodeEnv === 'test',
  };

  // Process blockchain configuration
  const blockchain: BlockchainConfig = {
    rpcUrl: blockchainRaw.rpcUrl,
    genesisContract: blockchainRaw.genesisContract,
    publisherNftAddress: blockchainRaw.publisherNftAddress,
    auditorNftAddress: blockchainRaw.auditorNftAddress,
  };

  // Process security configuration
  const security: SecurityConfig = {
    adminWalletAddresses: securityRaw.adminWalletAddresses,
    corsOrigin: securityRaw.corsOrigin,
    rateLimitStandard: securityRaw.rateLimitStandard,
    rateLimitStrict: securityRaw.rateLimitStrict,
    rateLimitAuth: securityRaw.rateLimitAuth,
  };

  return {
    database,
    server,
    blockchain,
    security,
  };
}

/**
 * Get database clients based on configuration
 * This replaces the scattered database initialization logic
 */
export function getDatabaseClients(config: AppConfig, logger: any): {
  ragPrisma: import('@prisma/client').PrismaClient;
  skillsPrisma: import('@prisma/client').PrismaClient;
  prisma: import('@prisma/client').PrismaClient; // For backward compatibility
} {
  const { PrismaClient } = require('@prisma/client');
  
  // Create RAG Prisma client
  const ragPrisma = new PrismaClient({
    log: config.server.nodeEnv === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: config.database.effectiveRagUrl,
      },
    },
  });

  // Create Skills Prisma client
  const skillsPrisma = new PrismaClient({
    log: config.server.nodeEnv === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    datasources: {
      db: {
        url: config.database.effectiveSkillsUrl,
      },
    },
  });

  // For backward compatibility, use skillsPrisma as default
  const prisma = skillsPrisma;

  return { ragPrisma, skillsPrisma, prisma };
}