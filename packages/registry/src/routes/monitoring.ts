import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getMetrics, getContentType } from '../monitoring/metrics';
import { AlertManager } from '../monitoring/alerts';
import * as winston from 'winston';

const router = Router();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Initialize AlertManager
const alertManager = new AlertManager(logger);

// Metrics endpoint for Prometheus
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getContentType());
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

// Dashboard data endpoint
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get system health
    const dbHealth = await checkDatabaseHealth();
    const systemHealth = await getSystemHealth();
    
    // Get performance metrics
    const performanceStats = await getPerformanceStats();
    
    // Get alert status
    const alerts = alertManager.getActiveAlerts();
    
    res.json({
      timestamp: new Date().toISOString(),
      health: {
        database: dbHealth,
        system: systemHealth,
        overall: dbHealth && systemHealth.status === 'healthy' ? 'healthy' : 'degraded',
      },
      performance: performanceStats,
      alerts: {
        active: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Health trends endpoint
router.get('/health/trends', async (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 24;
  
  // This would query a time-series database in production
  // For now, return mock data structure
  res.json({
    period: `${hours}h`,
    dataPoints: [],
    metrics: {
      uptime: 99.9,
      avgResponseTime: 120,
      errorRate: 0.01,
    },
  });
});

// Active alerts endpoint
router.get('/alerts', async (req: Request, res: Response) => {
  res.json({
    active: alertManager.getActiveAlerts(),
    total: alertManager.getAllAlerts().length,
  });
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const success = alertManager.acknowledgeAlert(id);
  
  if (success) {
    res.json({ message: 'Alert acknowledged' });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// Performance metrics endpoint
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.range || '1h';
    
    // Resource usage
    const resourceMetrics = getResourceMetrics();
    
    res.json({
      timeRange,
      resources: resourceMetrics,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Helper functions
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Simple health check - would use actual Prisma in production
    return true;
  } catch (error) {
    return false;
  }
}

async function getSystemHealth(): Promise<{ status: string; uptime: number; load: number[] }> {
  const memUsage = process.memoryUsage();
  const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  return {
    status: memPercentage > 90 ? 'degraded' : 'healthy',
    uptime: process.uptime(),
    load: [0, 0, 0], // Would use os.loadavg() in production
  };
}

async function getPerformanceStats() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
  };
}

function getResourceMetrics() {
  return {
    cpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };
}

export { router as monitoringRoutes };