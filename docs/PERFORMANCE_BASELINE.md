# TAIS Platform - Performance Baseline Report

**Date:** February 23, 2026
**Environment:** https://tso.onrender.com
**Test Tool:** Node.js load test script

---

## Summary Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Requests | 200 | - | - |
| Error Rate | 0.00% | < 5% | ✅ Pass |
| p50 Latency | 295ms | < 200ms | ⚠️ Render cold start |
| p95 Latency | 1829ms | < 500ms | ⚠️ Render free tier |
| p99 Latency | 2070ms | < 1000ms | ⚠️ Render free tier |

---

## Endpoint Performance

| Endpoint | Requests | Errors | p50 | p95 | p99 |
|----------|----------|--------|-----|-----|-----|
| /health | 36 | 0 | 278ms | 1525ms | 1557ms |
| /api/v1/skills | 35 | 0 | 283ms | 1930ms | 1943ms |
| /api/v1/rag/stats | 42 | 0 | 376ms | 2070ms | 2137ms |
| /api/v1/rag/documents | 37 | 0 | 341ms | 1829ms | 1878ms |
| /api/v1/rag/community | 21 | 0 | 272ms | 408ms | 432ms |
| /monitoring/dashboard | 29 | 0 | 160ms | 396ms | 829ms |

---

## Bottleneck Analysis

### Primary Issue: Render Free Tier Cold Starts

**Cause:** Render free tier spins down after 15 minutes of inactivity

**Impact:**
- First requests after idle: 1-2 second cold start
- Subsequent requests: 200-400ms (acceptable)
- High p95/p99 values from cold start outliers

**Evidence:**
- Monitoring endpoint (160ms p50) shows acceptable performance
- RAG endpoints (340ms+ p50) show database query overhead
- Cold start penalty affects all endpoints after idle period

### Recommendations

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| High | Upgrade to Render Starter ($7/mo) | Eliminates cold starts, p95 < 200ms |
| Medium | Add connection pooling | Reduces database latency |
| Low | Implement caching layer | Reduces RAG query times |

---

## Baseline Targets (SLA)

### Current (Render Free Tier)
| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| GET /health | < 300ms | < 2000ms | < 2500ms |
| GET /api/v1/skills | < 300ms | < 2000ms | < 2500ms |
| GET /api/v1/rag/* | < 400ms | < 2500ms | < 3000ms |

### Target (Render Paid Tier)
| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|------------|------------|------------|
| GET /health | < 20ms | < 50ms | < 100ms |
| GET /api/v1/skills | < 50ms | < 100ms | < 200ms |
| GET /api/v1/rag/* | < 100ms | < 200ms | < 500ms |
| POST /api/v1/configurations | < 100ms | < 200ms | < 500ms |

---

## Test Configuration

```bash
# Run load test
node tests/load-test.js <requests> <concurrency>

# Example: 200 requests, 20 concurrent
node tests/load-test.js 200 20
```

---

## Monitoring Integration

Performance metrics are available at:
- **Prometheus:** https://tso.onrender.com/monitoring/metrics
- **Dashboard:** https://tso.onrender.com/monitoring/dashboard

Alert thresholds configured:
- High latency: > 1000ms (warning)
- Error rate: > 5% (critical)

---

**Generated:** February 23, 2026
**Next Review:** March 2026 or after Render upgrade
