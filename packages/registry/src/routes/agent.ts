import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import cryptoJS from 'crypto-js';
import { verifySignature } from '../utils/signature';
import { verifyNFTOwnership } from '../services/genesisConfigLimits';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'tais-default-encryption-key-32b';

function encryptToken(token: string): string {
  return cryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

function decryptToken(encrypted: string): string {
  const bytes = cryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(cryptoJS.enc.Utf8);
}

function generateSessionId(): string {
  return 'sess_' + crypto.randomBytes(16).toString('hex');
}

interface AuthenticatedRequest extends Request {
  walletAddress?: string;
  appId?: string;
  scopes?: string[];
}

async function authenticateRequest(prisma: any, req: Request): Promise<{ walletAddress: string; scopes: string[] } | null> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authHeader.substring(7);

  const permission = await prisma.agentAppPermission.findFirst({
    where: {
      accessToken: encryptToken(accessToken),
      revokedAt: null,
    },
  });

  if (!permission) {
    return null;
  }

  if (new Date() > permission.expiresAt) {
    return null;
  }

  return {
    walletAddress: permission.walletAddress,
    scopes: permission.scopes,
  };
}

export function createAgentRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.get('/context', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = await authenticateRequest(prisma, req);
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      const { walletAddress, scopes } = auth;

      const tier = await verifyNFTOwnership(walletAddress);
      const isGold = tier !== 'free';

      const configs = await prisma.agentConfiguration.findMany({
        where: {
          walletAddress: walletAddress.toLowerCase(),
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      });

      const activeConfig = configs[0];

      const context: any = {
        agentId: activeConfig?.id || null,
        walletAddress,
        tier: isGold ? 'gold' : tier,
        config: {
          soul: null,
          profile: null,
          memory: null,
        },
        permissions: {
          scopes,
          expiresAt: null,
          grantedAt: null,
        },
        capabilities: {
          canExecuteCode: false,
          canAccessInternet: true,
          canReadFiles: false,
          canWriteFiles: false,
          availableTools: [],
        },
      };

      if (activeConfig) {
        context.config.name = activeConfig.name;
        context.config.description = activeConfig.description;
      }

      if (scopes.includes('agent:identity:read') || scopes.includes('agent:identity:soul:read')) {
        context.config.soul = activeConfig?.personalityMd || generateDefaultSoul(activeConfig?.name);
      }

      if (scopes.includes('agent:identity:read') || scopes.includes('agent:identity:profile:read')) {
        context.config.profile = generateDefaultProfile(walletAddress);
      }

      if (scopes.includes('agent:memory:read')) {
        const memoryEntries = await prisma.agentMemoryEntry.findMany({
          where: {
            walletAddress: walletAddress.toLowerCase(),
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        context.config.memory = memoryEntries
          .map(entry => `- ${entry.summary}`)
          .join('\n');
      }

      if (scopes.includes('agent:memory:write')) {
        context.capabilities.canWriteFiles = true;
      }

      res.json(context);
    } catch (error) {
      logger.error('Agent context error:', error);
      res.status(500).json({ error: 'Failed to retrieve agent context' });
    }
  });

  router.get('/memory', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = await authenticateRequest(prisma, req);
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      if (!auth.scopes.includes('agent:memory:read')) {
        return res.status(403).json({ error: 'Insufficient permissions: agent:memory:read required' });
      }

      const { type, limit = 50 } = req.query;

      const where: any = {
        walletAddress: auth.walletAddress.toLowerCase(),
      };

      if (type) {
        where.type = type as string;
      }

      const memories = await prisma.agentMemoryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 100),
      });

      res.json({
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          summary: m.summary,
          details: m.details,
          appId: m.appId,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Agent memory error:', error);
      res.status(500).json({ error: 'Failed to retrieve memory' });
    }
  });

  router.post('/memory', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = await authenticateRequest(prisma, req);
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      if (!auth.scopes.includes('agent:memory:write')) {
        return res.status(403).json({ error: 'Insufficient permissions: agent:memory:write required' });
      }

      const { type, summary, details, appId } = req.body;

      if (!type || !summary) {
        return res.status(400).json({ error: 'type and summary are required' });
      }

      const validTypes = ['PREFERENCE', 'ACTION', 'FACT', 'CONVERSATION'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      }

      const entry = await prisma.agentMemoryEntry.create({
        data: {
          walletAddress: auth.walletAddress.toLowerCase(),
          appId: appId || 'unknown',
          type,
          summary,
          details: details || {},
        },
      });

      res.json({
        success: true,
        entry: {
          id: entry.id,
          type: entry.type,
          summary: entry.summary,
          createdAt: entry.createdAt,
        },
      });
    } catch (error) {
      logger.error('Agent memory write error:', error);
      res.status(500).json({ error: 'Failed to write to memory' });
    }
  });

  router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = await authenticateRequest(prisma, req);
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      const { messages, appContext, parentSession: parentSessionId } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
      }

      const sessionId = generateSessionId();
      const walletAddress = auth.walletAddress.toLowerCase();
      const appId = req.headers['x-app-id'] as string || 'unknown';

      let inheritedMessages: any[] = [];
      
     Id) {
        const parentSession = await prisma.agentSession.findUnique({
 if (parentSession          where: { sessionId: parentSessionId },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (parentSession && parentSession.walletAddress === walletAddress) {
          inheritedMessages = parentSession.messages.reverse();
        }
      }

      const session = await prisma.agentSession.create({
        data: {
          sessionId,
          walletAddress,
          appId,
          parentSessionId: parentSessionId || null,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null,
        },
      });

      for (const msg of messages) {
        await prisma.agentSessionMessage.create({
          data: {
            sessionId: session.id,
            role: msg.role || 'user',
            content: msg.content,
            appContext: appContext || null,
          },
        });
      }

      const tier = await verifyNFTOwnership(walletAddress);
      
      const configs = await prisma.agentConfiguration.findMany({
        where: {
          walletAddress,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      });

      const systemPrompt = buildSystemPrompt(configs[0], auth.scopes, inheritedMessages);

      await prisma.appUsageMetric.create({
        data: {
          appId,
          walletAddress,
          interactionType: 'chat',
          tokensUsed: Math.floor((JSON.stringify(messages).length + systemPrompt.length) / 4),
          cost: 0,
          sessionId: session.id,
        },
      });

      res.json({
        sessionId,
        session: {
          sessionId: session.sessionId,
          startedAt: session.startedAt,
          parentSessionId: session.parentSessionId,
        },
        systemPrompt,
        message: 'Chat session created. Integrate with LLM provider for responses.',
      });
    } catch (error) {
      logger.error('Agent chat error:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auth = await authenticateRequest(prisma, req);
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      const { limit = 20 } = req.query;

      const sessions = await prisma.agentSession.findMany({
        where: {
          walletAddress: auth.walletAddress.toLowerCase(),
        },
        include: {
          app: {
            select: {
              appId: true,
              name: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { lastActiveAt: 'desc' },
        take: Math.min(Number(limit), 100),
      });

      res.json({
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          appId: s.app.appId,
          appName: s.app.name,
          messageCount: s._count.messages,
          startedAt: s.startedAt,
          lastActiveAt: s.lastActiveAt,
          endedAt: s.endedAt,
        })),
      });
    } catch (error) {
      logger.error('Agent sessions error:', error);
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  });

  return router;
}

function generateDefaultSoul(agentName?: string): string {
  return `# ${agentName || 'TAIS Agent'}

## Identity
You are a helpful AI assistant built on the TAIS platform.

## Communication Style
- Be clear and concise
- Provide helpful explanations
- Ask clarifying questions when needed

## Capabilities
- Access to knowledge base
- Memory of past interactions
- Tool usage (when authorized)
`;
}

function generateDefaultProfile(walletAddress: string): string {
  return `# User Profile

## Wallet
${walletAddress}

## Preferences
- Default communication style
- No specific restrictions

## History
- New TAIS user
`;
}

function buildSystemPrompt(config: any, scopes: string[], inheritedMessages: any[]): string {
  const parts: string[] = [];

  if (config?.personalityMd) {
    parts.push(`## Agent Personality\n${config.personalityMd}`);
  }

  if (inheritedMessages.length > 0) {
    const conversationHistory = inheritedMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    parts.push(`## Previous Session Context\n${conversationHistory}\n\nContinue from where the conversation left off.`);
  }

  if (scopes.includes('agent:memory:read')) {
    parts.push(`## Note\nThe user has an existing memory context. Consider their preferences when responding.`);
  }

  parts.push(`## Instructions
- Be helpful and concise
- Respect user privacy
- Use available tools when appropriate
`);

  return parts.join('\n\n');
}
