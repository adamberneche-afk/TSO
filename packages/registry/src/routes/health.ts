import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const prisma = (req as any).prisma;
  const ipfs = (req as any).ipfs;
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check IPFS connection if enabled
    let ipfsStatus = 'disabled';
    if (process.env.IPFS_ENABLED === 'true') {
      try {
        await ipfs.version();
        ipfsStatus = 'connected';
      } catch (e) {
        ipfsStatus = 'error';
      }
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        ipfs: ipfsStatus,
        blockchain: process.env.ENABLE_BLOCKCHAIN_VERIFICATION === 'true' ? 'enabled' : 'disabled'
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

router.get('/ready', async (req, res) => {
  const prisma = (req as any).prisma;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch (error) {
    res.status(503).send('Not Ready');
  }
});

export { router as healthRoutes };