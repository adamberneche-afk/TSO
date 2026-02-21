import * as winston from 'winston';

interface AlertConfig {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  cooldown: number;
  channels: string[];
}

interface Alert {
  id: string;
  name: string;
  severity: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  details?: Record<string, any>;
}

class AlertManager {
  private alerts: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private logger: winston.Logger;
  
  private alertConfigs: AlertConfig[] = [
    // System Health Alerts
    {
      name: 'high_error_rate',
      condition: (metrics) => metrics.errorRate > 0.05, // 5% error rate
      severity: 'critical',
      message: 'Error rate exceeded 5%',
      cooldown: 300, // 5 minutes
      channels: ['email'],
    },
    {
      name: 'high_latency',
      condition: (metrics) => metrics.avgResponseTime > 1000, // 1 second
      severity: 'warning',
      message: 'Average response time exceeded 1 second',
      cooldown: 600, // 10 minutes
      channels: ['email'],
    },
    {
      name: 'database_connection_failures',
      condition: (metrics) => metrics.dbConnectionFailures > 3,
      severity: 'critical',
      message: 'Multiple database connection failures detected',
      cooldown: 300,
      channels: ['email'],
    },
    {
      name: 'high_memory_usage',
      condition: (metrics) => metrics.memoryUsage > 90,
      severity: 'warning',
      message: 'Memory usage exceeded 90%',
      cooldown: 600,
      channels: ['email'],
    },
    
    // TAIS-Specific Alerts
    {
      name: 'nft_verification_failures',
      condition: (metrics) => 
        metrics.nftVerificationFailures && 
        metrics.nftVerificationFailures > 10,
      severity: 'warning',
      message: 'High rate of NFT verification failures',
      cooldown: 900, // 15 minutes
      channels: ['email'],
    },
    {
      name: 'config_save_failures',
      condition: (metrics) => 
        metrics.configSaveFailures && 
        metrics.configSaveFailures > 5,
      severity: 'warning',
      message: 'Multiple configuration save failures detected',
      cooldown: 600,
      channels: ['email'],
    },
    {
      name: 'rag_upload_failures',
      condition: (metrics) => 
        metrics.ragUploadFailures && 
        metrics.ragUploadFailures > 5,
      severity: 'warning',
      message: 'Multiple RAG upload failures detected',
      cooldown: 600,
      channels: ['email'],
    },
    {
      name: 'rate_limit_abuse',
      condition: (metrics) => 
        metrics.rateLimitHits && 
        metrics.rateLimitHits > 100,
      severity: 'warning',
      message: 'Unusual rate limit activity detected',
      cooldown: 300,
      channels: ['email'],
    },
    {
      name: 'wallet_auth_failures',
      condition: (metrics) => 
        metrics.walletAuthFailures && 
        metrics.walletAuthFailures > 20,
      severity: 'warning',
      message: 'High rate of wallet authentication failures',
      cooldown: 600,
      channels: ['email'],
    },
  ];

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  evaluateMetrics(metrics: any): void {
    for (const config of this.alertConfigs) {
      if (this.shouldTriggerAlert(config)) {
        try {
          if (config.condition(metrics)) {
            this.triggerAlert(config, metrics);
          }
        } catch (error) {
          this.logger.error(`Error evaluating alert ${config.name}:`, error);
        }
      }
    }
  }

  private shouldTriggerAlert(config: AlertConfig): boolean {
    const lastTime = this.lastAlertTime.get(config.name) || 0;
    const now = Date.now() / 1000;
    
    return now - lastTime > config.cooldown;
  }

  private triggerAlert(config: AlertConfig, metrics: any): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      severity: config.severity,
      message: config.message,
      timestamp: new Date(),
      acknowledged: false,
      details: metrics,
    };

    this.alerts.push(alert);
    this.lastAlertTime.set(config.name, Date.now() / 1000);

    this.logger.warn(`Alert triggered: ${config.name}`, {
      alert: { id: alert.id, name: alert.name, severity: alert.severity },
      channels: config.channels,
    });

    for (const channel of config.channels) {
      this.sendToChannel(channel, alert);
    }
  }

  private async sendToChannel(channel: string, alert: Alert): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmail(alert);
        break;
      case 'webhook':
        await this.sendWebhook(alert);
        break;
      default:
        this.logger.warn(`Unknown alert channel: ${channel}`);
    }
  }

  private async sendEmail(alert: Alert): Promise<void> {
    const alertEmail = process.env.ALERT_EMAIL_TO || 'taisplatform@gmail.com';
    const sendgridKey = process.env.SENDGRID_API_KEY;
    
    if (sendgridKey) {
      try {
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
                subject: `[TAIS ${alert.severity.toUpperCase()}] ${alert.name}`,
              },
            ],
            from: { email: alertEmail, name: 'TAIS Alerts' },
            content: [
              {
                type: 'text/plain',
                value: this.formatEmailBody(alert),
              },
              {
                type: 'text/html',
                value: this.formatEmailHtml(alert),
              },
            ],
          }),
        });

        if (response.ok) {
          this.logger.info(`Email alert sent to ${alertEmail}: ${alert.name}`);
        } else {
          const error = await response.text();
          this.logger.error(`Failed to send email alert: ${error}`);
        }
      } catch (error) {
        this.logger.error('Error sending email alert:', error);
      }
    } else {
      this.logger.info(`[MOCK EMAIL] To: ${alertEmail}, Subject: [TAIS ${alert.severity.toUpperCase()}] ${alert.name}`);
    }
  }

  private formatEmailBody(alert: Alert): string {
    return `
TAIS Platform Alert
===================

Alert: ${alert.name}
Severity: ${alert.severity.toUpperCase()}
Time: ${alert.timestamp.toISOString()}
Message: ${alert.message}

Details:
${JSON.stringify(alert.details, null, 2)}

---
This is an automated alert from the TAIS Platform monitoring system.
To acknowledge this alert, visit: https://tso.onrender.com/monitoring/alerts
    `.trim();
  }

  private formatEmailHtml(alert: Alert): string {
    const severityColors: Record<string, string> = {
      critical: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0B; color: #EDEDED; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${severityColors[alert.severity] || '#888'}; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: white; font-size: 20px; }
    .content { background: #141415; padding: 20px; border-radius: 0 0 8px 8px; }
    .detail { margin: 10px 0; }
    .label { color: #717171; font-size: 12px; text-transform: uppercase; }
    .value { color: #EDEDED; font-size: 14px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #262626; font-size: 12px; color: #717171; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 ${alert.name}</h1>
    </div>
    <div class="content">
      <div class="detail">
        <div class="label">Severity</div>
        <div class="value">${alert.severity.toUpperCase()}</div>
      </div>
      <div class="detail">
        <div class="label">Message</div>
        <div class="value">${alert.message}</div>
      </div>
      <div class="detail">
        <div class="label">Time</div>
        <div class="value">${alert.timestamp.toISOString()}</div>
      </div>
      <div class="footer">
        TAIS Platform Monitoring System<br>
        <a href="https://tso.onrender.com/monitoring/alerts">View all alerts</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private async sendWebhook(alert: Alert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: alert.timestamp.toISOString(),
          platform: 'TAIS',
        }),
      });
      
      this.logger.info(`Webhook alert sent: ${alert.name}`);
    } catch (error) {
      this.logger.error('Error sending webhook alert:', error);
    }
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

  clearOldAlerts(maxAge: number = 86400000): void {
    const cutoff = new Date(Date.now() - maxAge);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }
}

export { AlertManager, Alert, AlertConfig };
export default AlertManager;
