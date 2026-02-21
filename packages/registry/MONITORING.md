# Monitoring & Observability Guide

## Overview

TAIS Registry includes comprehensive monitoring and observability features:

- **Error Tracking** - Sentry integration for error monitoring
- **Metrics Collection** - Prometheus-compatible metrics
- **Health Monitoring** - Real-time system health dashboard
- **Alerting** - Automated email alerts for critical issues
- **Caching** - Redis for distributed caching (optional)
- **Performance Monitoring** - Response times, throughput, resource usage
- **Business Metrics** - Skills registered, audits submitted, downloads

## Quick Start

### 1. Sentry Error Tracking

**Setup:**
1. Create account at [sentry.io](https://sentry.io)
2. Create new project for "tais-registry"
3. Copy DSN from project settings
4. Add to environment variables:
   ```bash
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   ```

**Features:**
- ✅ Automatic error capture
- ✅ Performance monitoring
- ✅ Release tracking
- ✅ User context
- ✅ Breadcrumbs

**View Errors:**
```bash
# Errors automatically appear in Sentry dashboard
# URL: https://sentry.io/organizations/YOUR_ORG/projects/tais-registry/
```

### 2. Prometheus Metrics

**Metrics Endpoint:**
```
GET /monitoring/metrics
Content-Type: text/plain
```

**Available Metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `tais_http_request_duration_seconds` | Histogram | HTTP request latency |
| `tais_http_requests_total` | Counter | Total HTTP requests |
| `tais_active_connections` | Gauge | Active connections |
| `tais_db_query_duration_seconds` | Histogram | Database query latency |
| `tais_db_errors_total` | Counter | Database errors |
| `tais_skills_registered_total` | Counter | Skills registered |
| `tais_audits_submitted_total` | Counter | Audits submitted |
| `tais_skill_downloads_total` | Counter | Skill downloads |
| `tais_cache_hits_total` | Counter | Cache hits |
| `tais_cache_misses_total` | Counter | Cache misses |

**Scrape with Prometheus:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'tais-registry'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/monitoring/metrics'
```

### 3. Health Dashboard

**Dashboard Endpoint:**
```
GET /monitoring/dashboard
```

**Response:**
```json
{
  "timestamp": "2026-02-21T12:00:00Z",
  "health": {
    "database": true,
    "system": {
      "status": "healthy",
      "uptime": 3600,
      "load": [0.1, 0.05, 0.02]
    },
    "redis": {
      "available": true,
      "provider": "upstash",
      "connectionStatus": "Connected"
    },
    "overall": "healthy"
  },
  "performance": {
    "memory": {
      "used": 64,
      "total": 256,
      "percentage": 25
    }
  },
  "cache": {
    "provider": "redis",
    "nft": {
      "ttl": 900,
      "utilizationPercent": 0
    },
    "redis": {
      "usedMemory": "1.02M",
      "connectedClients": 1,
      "uptime": 7
    }
  },
  "alerts": {
    "active": 0,
    "critical": 0,
    "warning": 0
  }
}
```

### 4. Performance Monitoring

**Performance Endpoint:**
```
GET /monitoring/performance?range=1h
```

**Ranges:**
- `1h` - Last hour
- `24h` - Last 24 hours
- `7d` - Last 7 days

### 5. Alerting

**Alert Configuration:**

Alerts are configured automatically based on thresholds:

| Alert | Condition | Severity | Channels |
|-------|-----------|----------|----------|
| High Error Rate | Error rate > 5% | Critical | Email |
| High Latency | Avg response > 1s | Warning | Email |
| DB Connection Failures | > 3 failures | Critical | Email |
| High Memory | Usage > 90% | Warning | Email |
| NFT Verification Failures | > 10 failures | Warning | Email |
| Config Save Failures | > 5 failures | Warning | Email |
| RAG Upload Failures | > 5 failures | Warning | Email |
| Rate Limit Abuse | > 100 hits | Warning | Email |
| Wallet Auth Failures | > 20 failures | Warning | Email |

**Configure Alert Channels:**

```bash
# Email via SendGrid (recommended)
SENDGRID_API_KEY=SG.xxxxxxxx
ALERT_EMAIL_TO=alerts@example.com

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Webhook (optional)
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
```

**Test Alerts:**
```
POST /monitoring/alerts/test
```

**View Alerts:**
```
GET /monitoring/alerts
```

**Acknowledge Alert:**
```
POST /monitoring/alerts/:id/acknowledge
```

## Monitoring Stack

### Recommended Setup

**For MVP (Free):**
```
Sentry (free tier) - Error tracking
Render Dashboard - Basic metrics
Custom dashboard - /monitoring/dashboard
Upstash Redis (free tier) - Distributed caching
```

**For Production:**
```
Sentry - Error tracking
Upstash Redis - Caching (scaling from free)
Prometheus + Grafana - Metrics visualization
SendGrid - Email alerting
```

### Docker Compose Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      
  registry:
    build: .
    environment:
      - SENTRY_DSN=${SENTRY_DSN}
    ports:
      - "3000:3000"

volumes:
  grafana-storage:
```

## Grafana Dashboard

Import dashboard ID `1860` (Node Exporter) or create custom:

```json
{
  "dashboard": {
    "title": "TAIS Registry",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(tais_http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(tais_http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Logging

### Log Levels

- **error** - System errors, exceptions
- **warn** - Warnings, deprecated features
- **info** - General information
- **debug** - Debug information (development only)

### Log Format

```json
{
  "timestamp": "2024-02-05T20:00:00.000Z",
  "level": "info",
  "message": "Skill registered",
  "service": "tais-registry",
  "requestId": "req_123",
  "meta": {
    "skillHash": "0xabc...",
    "userId": "user_123"
  }
}
```

### View Logs

**Railway:**
```bash
railway logs --follow
```

**Docker:**
```bash
docker-compose logs -f registry
```

**Local:**
```bash
tail -f logs/combined.log
```

## Health Checks

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Docker Compose

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Business Metrics

Track key business metrics:

```typescript
import { 
  trackSkillRegistered, 
  trackAuditSubmitted,
  trackDownload 
} from './monitoring/metrics';

// When skill is registered
trackSkillRegistered('APPROVED');

// When audit is submitted
trackAuditSubmitted('SAFE');

// When skill is downloaded
trackDownload(skillHash);
```

## Best Practices

1. **Set up Sentry immediately** - Don't wait for errors to happen
2. **Monitor key metrics** - Response time, error rate, throughput
3. **Configure alerts** - Know about issues before users do
4. **Use structured logging** - Makes debugging easier
5. **Regular dashboard reviews** - Spot trends and issues early
6. **Test alerts** - Ensure notification channels work
7. **Document incidents** - Post-mortems help prevent recurrence

## Troubleshooting

### High Memory Usage

```bash
# Check heap usage
node --inspect dist/index.js
# Open chrome://inspect in Chrome

# Profile memory
npm install -g clinic
clinic doctor -- node dist/index.js
```

### Slow Database Queries

Enable query logging:
```bash
LOG_LEVEL=debug npm start
```

### Missing Metrics

Check Prometheus scraping:
```bash
curl http://localhost:3000/monitoring/metrics
```

### Alert Fatigue

Adjust thresholds:
```typescript
// In src/monitoring/alerts.ts
{
  name: 'high_error_rate',
  condition: (metrics) => metrics.errorRate > 0.05, // More lenient
  cooldown: 600, // Longer cooldown
}
```

### Redis Connection Issues

Check Redis status:
```bash
curl http://localhost:3000/monitoring/dashboard
# Look for: health.redis.connectionStatus
```

Verify environment variable:
```bash
# Make sure REDIS_URL is set in Render dashboard
echo $REDIS_URL
```

Redis fallback: If Redis is unavailable, the system automatically falls back to in-memory caching.

## Redis Caching

### Setup

1. Create free account at [upstash.com](https://upstash.com)
2. Create a new Redis database (free tier)
3. Copy the REST API URL
4. Add to Render environment variables:
   ```
   REDIS_URL=<your-upstash-url>
   ```

### Features

- **NFT Verification Cache** - 15-minute TTL
- **Automatic Fallback** - In-memory cache if Redis unavailable
- **Connection Monitoring** - Status shown in dashboard

### Cost Scaling

| Plan | Price | Commands/Mo | Storage |
|------|-------|-------------|---------|
| Free | $0 | 500K | 256MB |
| Fixed 250MB | $10/mo | Unlimited | 250MB |
| Fixed 1GB | $20/mo | Unlimited | 1GB |

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Upstash Redis](https://upstash.com/docs/)
- [SendGrid Documentation](https://docs.sendgrid.com/)

---

**Last Updated:** February 21, 2026
**Version:** 1.1.0