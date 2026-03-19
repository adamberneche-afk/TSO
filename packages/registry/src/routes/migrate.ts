import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
  prisma?: PrismaClient;
  log?: {
    info: (message: any, ...optional: any[]) => void;
    error: (message: any, ...optional: any[]) => void;
    warn: (message: any, ...optional: any[]) => void;
  };
}

export function createMigrateRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.post('/personality', async (req: AuthenticatedRequest, res: Response) => {
    req.prisma = prisma;
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "agent_configurations" ADD COLUMN IF NOT EXISTS "personality_md" TEXT
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "agent_configurations" ADD COLUMN IF NOT EXISTS "personality_version" INTEGER NOT NULL DEFAULT 1
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "agent_configurations_personality_version_idx" ON "agent_configurations"("personality_version")
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "agent_configurations" ALTER COLUMN "personality_version" SET DEFAULT 1
      `);
      
      // Migrate existing rows
      const result = await prisma.$executeRawUnsafe(`
        UPDATE "agent_configurations" 
        SET "personality_md" = NULL,
            "personality_version" = 1
        WHERE "personality_md" IS NULL
      `);
      
      // Get stats
      const stats = await prisma.agentConfiguration.aggregate({
        _count: {
          id: true,
          personalityMd: true,
        },
      });
      
      res.json({
        success: true,
        migrated: true,
        total: stats._count.id,
        withPersonality: stats._count.personalityMd
      });
    } catch (error) {
      req.log?.error({ error }, 'Migration error');
      res.status(500).json({ error: String(error) });
    }
  });
  
  return router;
}