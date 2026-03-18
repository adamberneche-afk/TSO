import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as winston from 'winston';

interface AuthenticatedRequest extends Request {
  prisma?: PrismaClient;
}

const router = Router();

// Migration fix endpoint - run once
router.post('/fix-migration', async (req: AuthenticatedRequest, res: Response) => {
  const prisma = req.prisma as PrismaClient;
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });

  try {
    logger.info('Starting migration fix...');

    // Step 1: Mark the failed migration as applied
    await prisma.$executeRaw`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      SELECT 
          gen_random_uuid(),
          'manual_fix',
          NOW(),
          '20260220000001_migrate_personality_data',
          'Manual fix - marking as applied',
          NULL,
          NOW(),
          1
      WHERE NOT EXISTS (
          SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260220000001_migrate_personality_data'
      )
    `;

    // Step 2: Ensure columns exist
    await prisma.$executeRaw`
      ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS personality_md TEXT
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE agent_configurations ADD COLUMN IF NOT EXISTS personality_version INTEGER NOT NULL DEFAULT 1
    `;

    // Step 3: Populate personalityMd for existing configs
    const result = await prisma.$executeRaw`
      UPDATE agent_configurations
      SET 
          personality_md = 'Agent Personality

## Identity
You are an AI assistant designed to help users effectively.

## Communication Style
- **Tone:** Balanced
- **Detail Level:** Balanced  
- **Formality:** Balanced

## Response Guidelines
1. Be helpful and accurate
2. Ask clarifying questions when needed
3. Provide actionable suggestions
4. Acknowledge limitations when appropriate

## Domain Knowledge
- General purpose assistance
- Adapts to user needs and context
',
          personality_version = 1
      WHERE personality_md IS NULL
    `;

    logger.info('Migration fix completed');
    
    res.json({
      success: true,
      message: 'Migration fixed successfully',
      configsUpdated: result
    });

  } catch (error) {
    logger.error('Migration fix failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as migrationFixRoutes };
