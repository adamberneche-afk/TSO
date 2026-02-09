import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getMetrics, getContentType } from '../monitoring/metrics';
import { AlertManager } from '../monitoring/alerts';

const router = Router();

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
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    // Get system health
    const dbHealth = await checkDatabaseHealth(prisma);
    const systemHealth = await getSystemHealth();
    
    // Get business metrics
    const skillStats = await getSkillStats(prisma);
    const auditStats = await getAuditStats(prisma);
    const apiStats = await getApiStats();
    
    // Get performance metrics
    const performanceStats = await getPerformanceStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      health: {
        database: dbHealth,
        system: systemHealth,
        overall: dbHealth && systemHealth.status === 'healthy' ? 'healthy' : 'degraded',
      },
      stats: {
        skills: skillStats,
        audits: auditStats,
        api: apiStats,
      },
      performance: performanceStats,
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
  const alertManager = (req as any).alertManager as AlertManager;
  
  res.json({
    active: alertManager.getActiveAlerts(),
    total: alertManager.getAllAlerts().length,
  });
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  const alertManager = (req as any).alertManager as AlertManager;
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
  const prisma = (req as any).prisma as PrismaClient;
  
  try {
    const timeRange = req.query.range || '1h';
    
    // Database performance
    const dbMetrics = await getDatabaseMetrics(prisma);
    
    // API performance
    const apiMetrics = await getApiMetrics();
    
    // Resource usage
    const resourceMetrics = getResourceMetrics();
    
    res.json({
      timeRange,
      database: dbMetrics,
      api: apiMetrics,
      resources: resourceMetrics,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Helper functions
async function checkDatabaseHealth(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

async function getSystemHealth(): Promise<{ status: string; uptime: number; load: number[] }> {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    load: [0, 0, 0], // Would use os.loadavg() in production
  };
}

async function getSkillStats(prisma: PrismaClient) {
  const [total, approved, blocked, downloads] = await Promise.all([
    prisma.skill.count(),
    prisma.skill.count({ where: { status: 'APPROVED' } }),
    prisma.skill.count({ where: { isBlocked: true } }),
    prisma.skill.aggregate({ _sum: { downloadCount: true } }),
  ]);
  
  return {
    total,
    approved,
    blocked,
    downloads: downloads._sum.downloadCount || 0,
  };
}

async function getAuditStats(prisma: PrismaClient) {
  const [total, safe, suspicious, malicious] = await Promise.all([
    prisma.audit.count(),
    prisma.audit.count({ where: { status: 'SAFE' } }),
    prisma.audit.count({ where: { status: 'SUSPICIOUS' } }),
    prisma.audit.count({ where: { status: 'MALICIOUS' } }),
  ]);
  
  return { total, safe, suspicious, malicious };
}

async function getApiStats() {
  // This would come from metrics collection in production
  return {
    requestsToday: 0,
    avgResponseTime: 0,
    errorRate: 0,
  };
}

async function getPerformanceStats() {
  // Memory usage
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpu: 0, // Would use cpuUsage() in production
    responseTime: {
      avg: 0,
      p95: 0,
      p99: 0,
    },
  };
}

async function getDatabaseMetrics(prisma: PrismaClient) {
  // This would query pg_stat tables in production
  return {
    connections: 0,
    queriesPerSecond: 0,
    avgQueryTime: 0,
    cacheHitRatio: 0,
  };
}

async function getApiMetrics() {
  return {
    requestsPerSecond: 0,
    errorRate: 0,
    avgResponseTime: 0,
    topEndpoints: [],
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