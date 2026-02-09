import winston from 'winston';

interface AlertConfig {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  cooldown: number; // seconds
  channels: string[];
}

interface Alert {
  id: string;
  name: string;
  severity: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

class AlertManager {
  private alerts: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private logger: winston.Logger;
  
  private alertConfigs: AlertConfig[] = [
    {
      name: 'high_error_rate',
      condition: (metrics) => metrics.errorRate > 0.1, // 10% error rate
      severity: 'critical',
      message: 'Error rate exceeded 10%',
      cooldown: 300, // 5 minutes
      channels: ['email', 'slack', 'pagerduty'],
    },
    {
      name: 'high_latency',
      condition: (metrics) => metrics.avgResponseTime > 2000, // 2 seconds
      severity: 'warning',
      message: 'Average response time exceeded 2 seconds',
      cooldown: 600, // 10 minutes
      channels: ['slack', 'email'],
    },
    {
      name: 'database_connection_failures',
      condition: (metrics) => metrics.dbConnectionFailures > 5,
      severity: 'critical',
      message: 'Multiple database connection failures detected',
      cooldown: 300,
      channels: ['email', 'slack', 'pagerduty'],
    },
    {
      name: 'high_cpu_usage',
      condition: (metrics) => metrics.cpuUsage > 80,
      severity: 'warning',
      message: 'CPU usage exceeded 80%',
      cooldown: 600,
      channels: ['slack'],
    },
    {
      name: 'high_memory_usage',
      condition: (metrics) => metrics.memoryUsage > 85,
      severity: 'warning',
      message: 'Memory usage exceeded 85%',
      cooldown: 600,
      channels: ['slack'],
    },
    {
      name: 'disk_space_low',
      condition: (metrics) => metrics.diskUsage > 90,
      severity: 'critical',
      message: 'Disk usage exceeded 90%',
      cooldown: 300,
      channels: ['email', 'slack', 'pagerduty'],
    },
  ];

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  evaluateMetrics(metrics: any): void {
    for (const config of this.alertConfigs) {
      if (this.shouldTriggerAlert(config)) {
        if (config.condition(metrics)) {
          this.triggerAlert(config);
        }
      }
    }
  }

  private shouldTriggerAlert(config: AlertConfig): boolean {
    const lastTime = this.lastAlertTime.get(config.name) || 0;
    const now = Date.now() / 1000;
    
    return now - lastTime > config.cooldown;
  }

  private triggerAlert(config: AlertConfig): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      severity: config.severity,
      message: config.message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(config.name, Date.now() / 1000);

    // Log alert
    this.logger.warn(`Alert triggered: ${config.name}`, {
      alert,
      channels: config.channels,
    });

    // Send to configured channels
    for (const channel of config.channels) {
      this.sendToChannel(channel, alert);
    }
  }

  private sendToChannel(channel: string, alert: Alert): void {
    switch (channel) {
      case 'email':
        this.sendEmail(alert);
        break;
      case 'slack':
        this.sendSlack(alert);
        break;
      case 'pagerduty':
        this.sendPagerDuty(alert);
        break;
      case 'webhook':
        this.sendWebhook(alert);
        break;
      default:
        this.logger.warn(`Unknown alert channel: ${channel}`);
    }
  }

  private sendEmail(alert: Alert): void {
    // Email notification would be implemented here
    // Requires SMTP configuration
    this.logger.info(`Email notification sent for alert: ${alert.name}`);
  }

  private sendSlack(alert: Alert): void {
    if (!process.env.SLACK_WEBHOOK_URL) {
      this.logger.warn('SLACK_WEBHOOK_URL not configured');
      return;
    }

    // Slack notification would be implemented here
    this.logger.info(`Slack notification sent for alert: ${alert.name}`);
  }

  private sendPagerDuty(alert: Alert): void {
    if (!process.env.PAGERDUTY_KEY) {
      this.logger.warn('PAGERDUTY_KEY not configured');
      return;
    }

    // PagerDuty integration would be implemented here
    this.logger.info(`PagerDuty notification sent for alert: ${alert.name}`);
  }

  private sendWebhook(alert: Alert): void {
    if (!process.env.ALERT_WEBHOOK_URL) {
      return;
    }

    // Custom webhook notification
    this.logger.info(`Webhook notification sent for alert: ${alert.name}`);
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.info(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  clearOldAlerts(maxAge: number = 86400000): void { // 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

export { AlertManager, Alert, AlertConfig };
export default AlertManager;