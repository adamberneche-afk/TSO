import { Router, Request, Response } from 'express';

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Debug - log all requests
  router.use((req, res, next) => {
    console.log('RCRT Route:', req.method, req.path);
    next();
  });

  router.get('/status', (req, res) => {
    console.log('status endpoint hit');
    res.json({ provisioned: false });
  });

  router.get('/test', (req, res) => {
    res.json({ test: 'ok' });
  });

  return router;
}
