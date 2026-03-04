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

  // ==================== INSIGHTS ====================

  // Create new insight
  router.post('/insights', async (req: Request, res: Response) => {
    try {
      const { title, content, category, walletAddress } = req.body;

      if (!title || !content || !category) {
        return res.status(400).json({ error: 'Title, content, and category required' });
      }

      const validCategories = ['value-prop', 'customer-pain', 'technical', 'architecture', 'lessons-learned'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const insight = await service.createInsight({ title, content, category, walletAddress });

      logger.info(`[CTO Insights] Created insight ${insight.id}`);

      res.status(201).json(insight);
    } catch (error) {
      logger.error('Error creating insight:', error);
      res.status(500).json({ error: 'Failed to create insight' });
    }
  });

  // List insights (public - only published)
  router.get('/insights', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const insights = await service.listInsights(status as string);

      res.json({ insights });
    } catch (error) {
      logger.error('Error listing insights:', error);
      res.status(500).json({ error: 'Failed to list insights' });
    }
  });

  // Get single insight
  router.get('/insights/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const insight = await service.getInsight(id);

      if (!insight) {
        return res.status(404).json({ error: 'Insight not found' });
      }

      res.json(insight);
    } catch (error) {
      logger.error('Error getting insight:', error);
      res.status(500).json({ error: 'Failed to get insight' });
    }
  });

  // Update insight status (publish/reject)
  router.patch('/insights/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, walletAddress } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status required' });
      }

      const validStatuses = ['draft', 'pending_review', 'published'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const insight = await service.updateInsightStatus(id, status, walletAddress);

      if (!insight) {
        return res.status(404).json({ error: 'Insight not found or unauthorized' });
      }

      logger.info(`[CTO Insights] Updated insight ${id} to ${status}`);

      res.json(insight);
    } catch (error) {
      logger.error('Error updating insight status:', error);
      res.status(500).json({ error: 'Failed to update insight status' });
    }
  });

  // Upvote insight
  router.post('/insights/:id/upvote', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const insight = await service.upvoteInsight(id);

      if (!insight) {
        return res.status(404).json({ error: 'Insight not found' });
      }

      res.json({ success: true, upvotes: insight.upvotes });
    } catch (error) {
      logger.error('Error upvoting insight:', error);
      res.status(500).json({ error: 'Failed to upvote insight' });
    }
  });

  // Delete insight
  router.delete('/insights/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const success = await service.deleteInsight(id, walletAddress);

      if (!success) {
        return res.status(404).json({ error: 'Insight not found or unauthorized' });
      }

      logger.info(`[CTO Insights] Deleted insight ${id}`);

      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting insight:', error);
      res.status(500).json({ error: 'Failed to delete insight' });
    }
  });

  return router;
}

export default createCTOAgentRoutes;
