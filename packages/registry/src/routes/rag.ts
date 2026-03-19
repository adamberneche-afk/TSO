import { Router, Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
}

const router = Router();

// Placeholder for RAG routes - to be implemented later
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: 'RAG API placeholder' });
});

export { router as ragRoutes };