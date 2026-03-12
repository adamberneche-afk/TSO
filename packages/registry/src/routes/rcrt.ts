import { Router, Request, Response } from 'express';

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  router.get('/test', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/status', (req, res) => {
    res.json({ provisioned: false });
  });

  return router;
}
