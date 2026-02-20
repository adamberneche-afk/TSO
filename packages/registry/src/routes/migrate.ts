import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/personality', async (req: Request, res: Response) => {
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

    const configs = await prisma.agentConfiguration.findMany({
      where: { personalityMd: null, configData: { not: {} as any } }
    });

    let migrated = 0;
    for (const config of configs) {
      const configData = config.configData as any;
      const personality = configData?.agent?.personality;
      if (personality) {
        const tone = personality.tone || 'balanced';
        const verbosity = personality.verbosity || 'balanced';
        const formality = personality.formality || 'balanced';
        
        const toneDesc = tone === 'direct' ? 'Get to the point quickly.' 
          : tone === 'conversational' ? 'Be friendly and engaging.' 
          : 'Provide clear explanations.';
        const verbDesc = verbosity === 'brief' ? 'Keep responses concise.' 
          : verbosity === 'detailed' ? 'Provide comprehensive explanations.' 
          : 'Provide moderate detail.';
        const formDesc = formality === 'casual' ? 'Use relaxed language.' 
          : formality === 'professional' ? 'Use formal language.' 
          : 'Professional yet approachable.';
        
        const md = `# Agent

## Identity
You are an AI assistant designed to help users effectively.

## Communication Style
- **Tone:** ${toneDesc}
- **Detail Level:** ${verbDesc}
- **Formality:** ${formDesc}

## Response Guidelines
1. Be helpful and accurate
2. Ask clarifying questions when needed
3. Provide actionable suggestions

## Domain Knowledge
- General purpose assistance
`;
        
        await prisma.agentConfiguration.update({
          where: { id: config.id },
          data: { personalityMd: md, personalityVersion: 1 }
        });
        migrated++;
      }
    }

    const stats = await prisma.agentConfiguration.aggregate({
      _count: { id: true, personalityMd: true }
    });

    res.json({ 
      success: true, 
      migrated,
      total: stats._count.id,
      withPersonality: stats._count.personalityMd
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
