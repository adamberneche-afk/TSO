/**
 * Environment Configuration Validator
 * Validates all environment variables before application startup
 */

import { z } from 'zod';

// Define environment schema
const envSchema = z.object({
  // Required
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Optional but recommended
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // IPFS Configuration
  IPFS_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  IPFS_HOST: z.string().optional(),
  IPFS_PORT: z.string().transform(Number).optional(),
  IPFS_PROTOCOL: z.enum(['http', 'https']).optional(),
  IPFS_PROJECT_ID: z.string().optional(),
  IPFS_PROJECT_SECRET: z.string().optional(),
  
  // Blockchain
  RPC_URL: z.string().url().optional(),
  PUBLISHER_NFT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  AUDITOR_NFT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // AWS (Optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Stripe (Optional)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  
  // Admin
  ADMIN_WALLET_ADDRESSES: z.string().optional(),
  
  // Testing
  TEST_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnvironment(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    
    // Additional validations
    if (env.NODE_ENV === 'production') {
      // Check for default/example values in production
      if (env.JWT_SECRET === 'your_super_secret_jwt_key_change_in_production') {
        throw new Error('JWT_SECRET is using default/example value in production');
      }
      
      // Validate IPFS if enabled
      if (env.IPFS_ENABLED) {
        if (!env.IPFS_PROJECT_ID || !env.IPFS_PROJECT_SECRET) {
          throw new Error('IPFS_PROJECT_ID and IPFS_PROJECT_SECRET required when IPFS is enabled');
        }
      }
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Export validated config
export const env = validateEnvironment();