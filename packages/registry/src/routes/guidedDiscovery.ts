import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import GuidedDiscoveryService from '../services/guidedDiscovery';

export function createGuidedDiscoveryRoutes(prisma: PrismaClient, logger: any): Router {
  const router = Router();
  const service = new GuidedDiscoveryService(prisma);

  router.get('/questions', async (req: Request, res: Response) => {
    try {
      const questions = service.getQuestions();
      res.json({ questions });
    } catch (error) {
      logger.error('Error getting questions:', error);
      res.status(500).json({ error: 'Failed to get questions' });
    }
  });

  router.post('/session/start', async (req: Request, res: Response) => {
    try {
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const { sessionId, firstQuestion } = await service.startSession(wallet);

      logger.info(`[Guided Discovery] Started session ${sessionId} for ${wallet}`);

      res.json({
        sessionId,
        question: firstQuestion,
        progress: 0,
        totalQuestions: 15,
      });
    } catch (error) {
      logger.error('Error starting session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  });

  router.get('/session/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const session = await service.getSession(id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const question = service.getQuestionById(
        GUIDED_DISCOVERY_QUESTIONS.find(q => q.order === session.currentStep)?.id || ''
      );

      res.json({
        sessionId: session.id,
        status: session.status,
        currentStep: session.currentStep,
        totalQuestions: 15,
        progress: Math.round((session.currentStep / 15) * 100),
        currentQuestion: question,
        responses: session.responses,
      });
    } catch (error) {
      logger.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  router.post('/session/:id/answer', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { questionId, answer } = req.body;

      if (!questionId || answer === undefined) {
        return res.status(400).json({ error: 'Question ID and answer required' });
      }

      const result = await service.submitAnswer(id, questionId, answer);

      logger.info(`[Guided Discovery] Session ${id}: answered ${questionId}, progress: ${result.progress}%`);

      if (result.completed) {
        res.json({
          completed: true,
          message: 'Guided discovery completed!',
          progress: 100,
        });
      } else {
        res.json({
          completed: false,
          question: result.nextQuestion,
          progress: result.progress,
          totalQuestions: 15,
        });
      }
    } catch (error) {
      logger.error('Error submitting answer:', error);
      res.status(500).json({ error: 'Failed to submit answer' });
    }
  });

  router.post('/session/:id/generate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const session = await service.getSession(id);
      if (!session || session.status !== 'completed') {
        return res.status(400).json({ error: 'Complete guided discovery first' });
      }

      if (session.walletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { personality, systemPrompt, config } = await service.generateConfigFromSession(id);

      logger.info(`[Guided Discovery] Generated config for session ${id}`);

      res.json({
        personality,
        systemPrompt,
        config,
        message: 'Configuration generated from guided discovery',
      });
    } catch (error) {
      logger.error('Error generating config:', error);
      res.status(500).json({ error: 'Failed to generate config' });
    }
  });

  router.delete('/session/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { wallet } = req.body;

      const session = await service.getSession(id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (wallet && session.walletAddress !== wallet.toLowerCase()) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await prisma.guidedDiscoverySession.delete({
        where: { id },
      });

      logger.info(`[Guided Discovery] Deleted session ${id}`);

      res.json({ message: 'Session deleted' });
    } catch (error) {
      logger.error('Error deleting session:', error);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  return router;
}

const GUIDED_DISCOVERY_QUESTIONS = [
  { id: 'primary_function', order: 1 },
  { id: 'use_cases', order: 2 },
  { id: 'problem_solved', order: 3 },
  { id: 'target_audience', order: 4 },
  { id: 'audience_expertise', order: 5 },
  { id: 'audience_goals', order: 6 },
  { id: 'unique_value', order: 7 },
  { id: 'brand_voice', order: 8 },
  { id: 'must_avoid', order: 9 },
  { id: 'response_length', order: 10 },
  { id: 'communication_style', order: 11 },
  { id: 'format_preference', order: 12 },
  { id: 'knowledge_domains', order: 13 },
  { id: 'data_sources', order: 14 },
  { id: 'knowledge_gaps', order: 15 },
];

export default createGuidedDiscoveryRoutes;
