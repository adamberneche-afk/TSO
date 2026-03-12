import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const provisionedAgents = new Map<string, { token: string; createdAt: Date }>();

export function createRCRTRoutes(prisma: any, logger: any): Router {
  const router = Router();

  // Get RCRT status - checks if user has provisioned
  router.get('/status', (req, res) => {
    const wallet = req.query.wallet as string;
    const agent = provisionedAgents.get(wallet);
    
    if (agent) {
      res.json({ 
        provisioned: true,
        connected: false,
        token: agent.token,
        instructions: 'RCRT is provisioned. Make sure RCRT is running and connected to TAIS.'
      });
    } else {
      res.json({ 
        provisioned: false,
        connected: false 
      });
    }
  });

  // Provision RCRT - creates a token for the user
  router.post('/provision', (req, res) => {
    const wallet = req.query.wallet as string || req.body.wallet;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const token = crypto.randomUUID();
    provisionedAgents.set(wallet, { 
      token, 
      createdAt: new Date() 
    });

    res.json({
      success: true,
      token: token,
      instructions: {
        step1: 'Download and run RCRT on your device',
        step2: 'RCRT will automatically connect to TAIS using your token',
        note: 'Token: ' + token.substring(0, 8) + '...'
      },
      endpoints: {
        baseUrl: 'https://tso.onrender.com',
        wsPath: '/api/v1/rcrt/connect'
      }
    });
  });

  // RCRT connects to this endpoint to register/heartbeat
  router.post('/connect', (req, res) => {
    const { token, status } = req.body;
    
    // Find wallet by token
    let foundWallet = null;
    for (const [wallet, data] of provisionedAgents.entries()) {
      if (data.token === token) {
        foundWallet = wallet;
        break;
      }
    }

    if (!foundWallet) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ 
      success: true, 
      wallet: foundWallet,
      message: 'Connected to TAIS' 
    });
  });

  return router;
}
