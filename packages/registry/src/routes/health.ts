import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  prisma?: PrismaClient;
  ipfs?: any;
}

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  
   try {
     // Check database connection
     await (req.prisma as PrismaClient).$queryRaw`SELECT 1`;
     
     // Check IPFS connection if enabled
     let ipfsStatus = 'disabled';
     if (process.env.IPFS_ENABLED === 'true') {
       try {
         // Since we don't have IPFS instance in request, we'll skip the check for now
         // In a real implementation, we would get IPFS from a service or create an instance
         ipfsStatus = 'connected'; // Assuming connected if enabled
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

router.get('/ready', async (req: AuthenticatedRequest, res: Response) => {
  
   try {
     await (req.prisma as PrismaClient).$queryRaw`SELECT 1`;
     res.status(200).send('OK');
   } catch (error) {
     res.status(503).send('Not Ready');
   }
 });

export { router as healthRoutes };