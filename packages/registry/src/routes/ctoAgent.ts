import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import CTOAgentService, { CTOPhase } from '../services/ctoAgent';

export function createCTOAgentRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();
  const service = new CTOAgentService(prisma);

  // Get service info (phases, expertise areas)
  router.get('/info', async (req: Request, res: Response) => {
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
  });

  // Create new project
  router.post('/projects', async (req: Request, res: Response) => {
    try {
      const { wallet, name, description } = req.body;

      if (!wallet || !name) {
        return res.status(400).json({ error: 'Wallet address and project name required' });
      }

      const project = await service.createProject(wallet, name, description);

      logger.info(`[CTO Agent] Created project ${project.id} for ${wallet}`);

      res.status(201).json(project);
    } catch (error) {
      logger.error('Error creating CTO project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // List user's projects
  router.get('/projects', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const projects = await service.listProjects(wallet);

      res.json({ projects });
    } catch (error) {
      logger.error('Error listing CTO projects:', error);
      res.status(500).json({ error: 'Failed to list projects' });
    }
  });

  // Get specific project
  router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.query;

      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const project = await service.getProject(id, wallet);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      logger.error('Error getting CTO project:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  });

  // Update project phase
  router.patch('/projects/:id/phase', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet, phase } = req.body;

      if (!wallet || !phase) {
        return res.status(400).json({ error: 'Wallet address and phase required' });
      }

      const validPhases = ['planning', 'architecture', 'development', 'testing', 'launch'];
      if (!validPhases.includes(phase)) {
        return res.status(400).json({ error: 'Invalid phase' });
      }

      const project = await service.updatePhase(id, wallet, phase as CTOPhase);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.info(`[CTO Agent] Updated project ${id} to phase ${phase}`);

      res.json(project);
    } catch (error) {
      logger.error('Error updating CTO project phase:', error);
      res.status(500).json({ error: 'Failed to update phase' });
    }
  });

  // Add pain point
  router.post('/projects/:id/pain-points', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet, area, description } = req.body;

      if (!wallet || !area || !description) {
        return res.status(400).json({ error: 'Wallet, area, and description required' });
      }

      const painPoint = await service.addPainPoint(id, wallet, area, description);

      if (!painPoint) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.info(`[CTO Agent] Added pain point to project ${id}: ${area}`);

      res.status(201).json(painPoint);
    } catch (error) {
      logger.error('Error adding pain point:', error);
      res.status(500).json({ error: 'Failed to add pain point' });
    }
  });

  // Resolve pain point
  router.patch('/projects/:id/pain-points/:index/resolve', async (req: Request, res: Response) => {
    try {
      const { id, index } = req.params;
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const success = await service.resolvePainPoint(id, wallet, parseInt(index));

      if (!success) {
        return res.status(404).json({ error: 'Project or pain point not found' });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error resolving pain point:', error);
      res.status(500).json({ error: 'Failed to resolve pain point' });
    }
  });

  // Add blocker
  router.post('/projects/:id/blockers', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet, description } = req.body;

      if (!wallet || !description) {
        return res.status(400).json({ error: 'Wallet and description required' });
      }

      const blocker = await service.addBlocker(id, wallet, description);

      if (!blocker) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.info(`[CTO Agent] Added blocker to project ${id}`);

      res.status(201).json(blocker);
    } catch (error) {
      logger.error('Error adding blocker:', error);
      res.status(500).json({ error: 'Failed to add blocker' });
    }
  });

  // Resolve blocker
  router.patch('/projects/:id/blockers/:index/resolve', async (req: Request, res: Response) => {
    try {
      const { id, index } = req.params;
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const success = await service.resolveBlocker(id, wallet, parseInt(index));

      if (!success) {
        return res.status(404).json({ error: 'Project or blocker not found' });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error resolving blocker:', error);
      res.status(500).json({ error: 'Failed to resolve blocker' });
    }
  });

  // Complete project (launch)
  router.post('/projects/:id/complete', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet required' });
      }

      const success = await service.completeProject(id, wallet);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      logger.info(`[CTO Agent] Project ${id} marked as completed`);

      res.json({ success: true, message: 'Project marked as launched!' });
    } catch (error) {
      logger.error('Error completing project:', error);
      res.status(500).json({ error: 'Failed to complete project' });
    }
  });

  return router;
}

export default createCTOAgentRoutes;
