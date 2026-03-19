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

export function createCTOAgentRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();
  const service = new CTOAgentService(prisma);

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
      const { wallet, name, description } = req.body;

      if (!wallet || !name) {
        return res.status(400).json({ error: 'Wallet address and project name required' });
      }

      const project = await service.createProject(wallet as string, name, description);

      req.log?.info(`[CTO Agent] Created project ${project.id} for ${wallet}`);

      res.status(201).json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error creating CTO project');
      next(error);
    }
  });

  // List user's projects
  router.get('/projects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const projects = await service.getUserProjects(wallet as string);

      res.json({ projects });
    } catch (error) {
      req.log?.error({ error }, 'Error getting user projects');
      next(error);
    }
  });

  // Get project details
  router.get('/projects/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const project = await service.getProjectDetails(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error getting project details');
      next(error);
    }
  });

  // Update project phase
  router.post('/projects/:id/phase', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { phase } = req.body;

      const project = await service.updateProjectPhase(id, phase as CTOPhase);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      req.log?.info(`[CTO Agent] Updated project ${id} to phase ${phase}`);

      res.json(project);
    } catch (error) {
      req.log?.error({ error }, 'Error updating project phase');
      next(error);
    }
  });

  // Add pain point to project
  router.post('/projects/:id/pain-points', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { area, description } = req.body;

      const painPoint = await service.addPainPoint(id, area, description);

      if (!painPoint) {
        return res.status(404).json({ error: 'Project not found' });
      }

      req.log?.info(`[CTO Agent] Added pain point to project ${id}: ${area}`);

      res.json(painPoint);
    } catch (error) {
      req.log?.error({ error }, 'Error adding pain point');
      next(error);
    }
  });

  // Add blocker to project
  router.post('/projects/:id/blockers', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { description } = req.body;

      const blocker = await service.addBlocker(id, description);

      if (!blocker) {
        return res.status(404).json({ error: 'Project not found' });
      }

      req.log?.info(`[CTO Agent] Added blocker to project ${id}`);

      res.json(blocker);
    } catch (error) {
      req.log?.error({ error }, 'Error adding blocker');
      next(error);
    }
  });

   // Resolve pain point
   router.post('/projects/:id/pain-points/:painPointId/resolve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
     try {
       const { id, painPointId } = req.params;
       const painPointIndex = parseInt(painPointId, 10);

       if (isNaN(painPointIndex)) {
         return res.status(400).json({ error: 'Invalid pain point ID' });
       }

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

   // Resolve blocker
   router.post('/projects/:id/blockers/:blockerId/resolve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
     try {
       const { id, blockerId } = req.params;
       const blockerIndex = parseInt(blockerId, 10);

       if (isNaN(blockerIndex)) {
         return res.status(400).json({ error: 'Invalid blocker ID' });
       }

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

  return router;
}