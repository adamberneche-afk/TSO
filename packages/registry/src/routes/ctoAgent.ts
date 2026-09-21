import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CTOAgentService, CTOPhase } from '../services/ctoAgent';

// Extend Express Request type to include our custom properties
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

const INSIGHT_CATEGORIES = ['value-prop', 'customer-pain', 'technical', 'architecture', 'lessons-learned'];

export function createCTOAgentRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();
  const service = new CTOAgentService(prisma);

  // Every route below runs behind authMiddleware (see index.ts), so
  // req.user is always populated by the time a handler runs; this helper
  // just satisfies the type system and gives a clear error if that ever
  // changes.
  function requireWallet(req: AuthenticatedRequest, res: Response): string | null {
    if (!req.user?.walletAddress) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }
    return req.user.walletAddress.toLowerCase();
  }

  // Fetches a project and verifies the authenticated caller owns it.
  // Every one of the routes below used to trust a client-submitted
  // `wallet` (or no wallet check at all) to decide whose projects to
  // read/mutate -- any caller who knew or guessed a project id (or another
  // user's wallet address) could read or edit that user's CTO projects,
  // pain points, and blockers. Every handler below now goes through this
  // check instead.
  async function loadOwnedProject(id: string, walletAddress: string, res: Response) {
    const project = await service.getProjectDetails(id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return null;
    }
    if (project.walletAddress.toLowerCase() !== walletAddress) {
      res.status(403).json({ error: 'You do not have access to this project' });
      return null;
    }
    return project;
  }

  // Get service info (phases, expertise areas)
  router.get('/info', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        phases: service.getAvailablePhases(),
        phasePrompts: {
          planning: service.getPhasePrompt('planning'),
          architecture: service.getPhasePrompt('architecture'),
          development: service.getPhasePrompt('development'),
          testing: service.getPhasePrompt('testing'),
          launch: service.getPhasePrompt('launch'),
        },
        expertiseAreas: service.getAreasOfExpertise(),
      });
    } catch (error) {
      req.log?.error({ error }, 'Error getting CTO agent info');
      next(error);
    }
  });

  // Create new project
  router.post('/projects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Project name required' });
      }

      const project = await service.createProject(walletAddress, name, description);

      req.log?.info(`[CTO Agent] Created project ${project.id} for ${walletAddress}`);

      res.status(201).json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error creating CTO project');
      next(error);
    }
  });

  // List the authenticated caller's own projects
  router.get('/projects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const projects = await service.getUserProjects(walletAddress);

      res.json({ projects });
    } catch (error) {
      req.log?.error({ error }, 'Error getting user projects');
      next(error);
    }
  });

  // Get project details (only the owner may view it)
  router.get('/projects/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const project = await loadOwnedProject(req.params.id, walletAddress, res);
      if (!project) return;

      res.json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error getting project details');
      next(error);
    }
  });

  // Update project phase (only the owner may mutate it)
  router.post('/projects/:id/phase', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const { id } = req.params;
      const { phase } = req.body;

      if (!(await loadOwnedProject(id, walletAddress, res))) return;

      const project = await service.updateProjectPhase(id, phase as CTOPhase);

      req.log?.info(`[CTO Agent] Updated project ${id} to phase ${phase}`);

      res.json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error updating project phase');
      next(error);
    }
  });

  // Add pain point to project (only the owner may mutate it)
  router.post('/projects/:id/pain-points', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const { id } = req.params;
      const { area, description } = req.body;

      if (!(await loadOwnedProject(id, walletAddress, res))) return;

      const painPoint = await service.addPainPoint(id, area, description);

      req.log?.info(`[CTO Agent] Added pain point to project ${id}: ${area}`);

      res.json(painPoint);
    } catch (error) {
      req.log?.error({ error }, 'Error adding pain point');
      next(error);
    }
  });

  // Add blocker to project (only the owner may mutate it)
  router.post('/projects/:id/blockers', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const { id } = req.params;
      const { description } = req.body;

      if (!(await loadOwnedProject(id, walletAddress, res))) return;

      const blocker = await service.addBlocker(id, description);

      req.log?.info(`[CTO Agent] Added blocker to project ${id}`);

      res.json(blocker);
    } catch (error) {
      req.log?.error({ error }, 'Error adding blocker');
      next(error);
    }
  });

   // Resolve pain point (only the owner may mutate it)
   router.post('/projects/:id/pain-points/:painPointId/resolve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
     try {
       const walletAddress = requireWallet(req, res);
       if (!walletAddress) return;

       const { id, painPointId } = req.params;
       const painPointIndex = parseInt(painPointId, 10);

       if (isNaN(painPointIndex)) {
         return res.status(400).json({ error: 'Invalid pain point ID' });
       }

       if (!(await loadOwnedProject(id, walletAddress, res))) return;

       const painPoint = await service.resolvePainPoint(id, painPointIndex);

       if (!painPoint) {
         return res.status(404).json({ error: 'Pain point not found' });
       }

       req.log?.info(`[CTO Agent] Resolved pain point ${painPointId} in project ${id}`);

       res.json(painPoint);
     } catch (error) {
       req.log?.error({ error }, 'Error resolving pain point');
       next(error);
     }
   });

   // Resolve blocker (only the owner may mutate it)
   router.post('/projects/:id/blockers/:blockerId/resolve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
     try {
       const walletAddress = requireWallet(req, res);
       if (!walletAddress) return;

       const { id, blockerId } = req.params;
       const blockerIndex = parseInt(blockerId, 10);

       if (isNaN(blockerIndex)) {
         return res.status(400).json({ error: 'Invalid blocker ID' });
       }

       if (!(await loadOwnedProject(id, walletAddress, res))) return;

       const blocker = await service.resolveBlocker(id, blockerIndex);

       if (!blocker) {
         return res.status(404).json({ error: 'Blocker not found' });
       }

       req.log?.info(`[CTO Agent] Resolved blocker ${blockerId} in project ${id}`);

       res.json(blocker);
     } catch (error) {
       req.log?.error({ error }, 'Error resolving blocker');
       next(error);
     }
   });

  // Community Knowledge Base insights
  //
  // These two endpoints previously didn't exist anywhere in this router
  // (or anywhere else) despite the frontend's Knowledge Base tab actively
  // calling them and the matching `CTOInsight` Prisma model already
  // existing. Not filtered by `status` on read: nothing anywhere in this
  // codebase ever transitions an insight's status past its 'draft'
  // default, so a 'published'-only filter would make every submitted
  // insight permanently invisible.
  router.get('/insights', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const insights = await prisma.cTOInsight.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ insights });
    } catch (error) {
      req.log?.error({ error }, 'Error getting CTO insights');
      next(error);
    }
  });

  router.post('/insights', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const walletAddress = requireWallet(req, res);
      if (!walletAddress) return;

      const { title, content, category } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      if (!INSIGHT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${INSIGHT_CATEGORIES.join(', ')}` });
      }

      const insight = await prisma.cTOInsight.create({
        data: { title, content, category, walletAddress },
      });

      req.log?.info(`[CTO Agent] Created insight ${insight.id} for ${walletAddress}`);

      res.status(201).json(insight);
    } catch (error) {
      req.log?.error({ error }, 'Error creating CTO insight');
      next(error);
    }
  });

  return router;
}