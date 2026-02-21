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

// Alert configurations endpoint
router.get('/alerts/configs', async (req: Request, res: Response) => {
  res.json({
    configs: alertManager.getAlertConfigs(),
  });
});

// Evaluate alerts manually
router.post('/alerts/evaluate', async (req: Request, res: Response) => {
  try {
    const metrics = req.body;
    alertManager.evaluateMetrics(metrics);
    res.json({ 
      message: 'Alerts evaluated',
      activeAlerts: alertManager.getActiveAlerts().length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate alerts' });
  }
});

// Test email alert
router.post('/alerts/test', async (req: Request, res: Response) => {
  try {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const alertEmail = process.env.ALERT_EMAIL_TO || 'taisplatform@gmail.com';
    
    if (!sendgridKey) {
      return res.json({ 
        message: 'SendGrid not configured - email logged only',
        email: alertEmail,
        configured: false,
        hint: 'Set SENDGRID_API_KEY in Render environment variables'
      });
    }

    const testAlert = {
      id: `test_${Date.now()}`,
      name: 'test_alert',
      severity: 'info' as const,
      message: 'This is a test alert from TAIS monitoring',
      timestamp: new Date(),
      acknowledged: false,
      details: { test: true, triggeredBy: 'manual' },
    };

    // Send via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: alertEmail }],
            subject: `[TAIS INFO] test_alert`,
          },
        ],
        from: { email: alertEmail, name: 'TAIS Alerts' },
        content: [
          {
            type: 'text/plain',
            value: `TAIS Test Alert\n\nThis is a test alert from TAIS monitoring.\n\nTime: ${new Date().toISOString()}\n\nIf you received this, email alerts are working!`,
          },
        ],
      }),
    });

    if (response.ok) {
      res.json({ 
        message: 'Test alert sent successfully',
        email: alertEmail,
        configured: true,
        status: 'sent'
      });
    } else {
      const error = await response.text();
      res.status(500).json({ 
        message: 'SendGrid error',
        email: alertEmail,
        configured: true,
        status: 'failed',
        error: error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to send test alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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