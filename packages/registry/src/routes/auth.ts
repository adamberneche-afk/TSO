import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// POST /api/auth/login - Login with wallet signature
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    // TODO: Verify signature
    // This would verify the Ethereum signature
    
    // Generate JWT
    const token = jwt.sign(
      { walletAddress },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      walletAddress,
      expiresIn: '7d'
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// POST /api/auth/verify - Verify JWT token
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      valid: true,
      walletAddress: (decoded as any).walletAddress
    });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// POST /api/auth/api-key - Generate API key
router.post('/api-key', async (req: Request, res: Response) => {
  // This would require authentication middleware
  // For now, stub implementation
  res.json({
    apiKey: 'tais_' + Math.random().toString(36).substring(2, 15),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
});

export { router as authRoutes };