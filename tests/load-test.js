const https = require('https');

const BASE_URL = 'tso.onrender.com';
const TEST_WALLET = '0x8f49701734bfe3f3331c6f8ffeb814f73e4f5102';
const TEST_APP_ID = 'sandbox_testapp123';

const endpoints = [
  // Core endpoints
  { name: 'health', path: '/health' },
  { name: 'skills', path: '/api/v1/skills' },
  
  // RAG endpoints
  { name: 'rag-stats', path: `/api/v1/rag/stats?wallet=${TEST_WALLET}` },
  { name: 'rag-docs', path: `/api/v1/rag/documents?wallet=${TEST_WALLET}` },
  { name: 'rag-community', path: '/api/v1/rag/community?limit=10' },
  
  // OAuth endpoints
  { name: 'oauth-apps', path: '/api/v1/oauth/apps' },
  { name: 'oauth-permissions', path: `/api/v1/oauth/permissions?wallet=${TEST_WALLET}` },
  { name: 'oauth-sandbox-status', path: `/api/v1/oauth/sandbox/status?wallet=${TEST_WALLET}` },
  
  // Agent endpoints
  { name: 'agent-configs', path: `/api/v1/agent/configurations?wallet=${TEST_WALLET}` },
  { name: 'agent-public', path: '/api/v1/agent/public' },
  
  // Billing endpoints
  { name: 'billing-plans', path: '/api/v1/billing/plans' },
  { name: 'billing-usage', path: `/api/v1/billing/usage?wallet=${TEST_WALLET}` },
  
  // Enterprise endpoints
  { name: 'enterprise-agents', path: `/api/v1/enterprise/agents?wallet=${TEST_WALLET}` },
  
  // Monitoring
  { name: 'monitoring', path: '/monitoring/dashboard' },
];

const results = {};
endpoints.forEach(e => results[e.name] = []);

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.request({
      hostname: BASE_URL,
      path: endpoint.path,
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          endpoint: endpoint.name,
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        endpoint: endpoint.name,
        status: 0,
        duration: Date.now() - start,
        success: false,
        error: err.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: endpoint.name,
        status: 0,
        duration: 10000,
        success: false,
        error: 'timeout',
      });
    });
    
    req.end();
  });
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runLoadTest(requests, concurrency = 10) {
  console.log(`\nRunning load test: ${requests} requests with ${concurrency} concurrency...\n`);
  
  const allResults = [];
  const batches = Math.ceil(requests / concurrency);
  
  for (let i = 0; i < batches; i++) {
    const batchPromises = [];
    const batchSize = Math.min(concurrency, requests - (i * concurrency));
    
    for (let j = 0; j < batchSize; j++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      batchPromises.push(makeRequest(endpoint));
    }
    
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults);
    
    process.stdout.write(`\rProgress: ${allResults.length}/${requests} requests completed`);
  }
  
  console.log('\n');
  return allResults;
}

function generateReport(results) {
  const byEndpoint = {};
  
  results.forEach(r => {
    if (!byEndpoint[r.endpoint]) {
      byEndpoint[r.endpoint] = { durations: [], errors: 0, successes: 0 };
    }
    byEndpoint[r.endpoint].durations.push(r.duration);
    if (r.success) {
      byEndpoint[r.endpoint].successes++;
    } else {
      byEndpoint[r.endpoint].errors++;
    }
  });
  
  const totalRequests = results.length;
  const totalErrors = results.filter(r => !r.success).length;
  const errorRate = (totalErrors / totalRequests * 100).toFixed(2);
  const allDurations = results.map(r => r.duration);
  const rps = totalRequests / (results.reduce((sum, r) => sum + r.duration, 0) / 1000);
  
  console.log('# TAIS Platform - Performance Baseline Report\n');
  console.log(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  console.log(`**Environment:** https://${BASE_URL}\n`);
  console.log('---\n');
  console.log('## Summary Metrics\n');
  console.log('| Metric | Value | Target | Status |');
  console.log('|--------|-------|--------|--------|');
  console.log(`| Total Requests | ${totalRequests} | - | - |`);
  console.log(`| Error Rate | ${errorRate}% | < 5% | ${parseFloat(errorRate) < 5 ? '✅' : '❌'} |`);
  console.log(`| p50 Latency | ${percentile(allDurations, 50)}ms | < 200ms | ${percentile(allDurations, 50) < 200 ? '✅' : '⚠️'} |`);
  console.log(`| p95 Latency | ${percentile(allDurations, 95)}ms | < 500ms | ${percentile(allDurations, 95) < 500 ? '✅' : '⚠️'} |`);
  console.log(`| p99 Latency | ${percentile(allDurations, 99)}ms | < 1000ms | ${percentile(allDurations, 99) < 1000 ? '✅' : '⚠️'} |`);
  
  console.log('\n---\n');
  console.log('## Endpoint Performance\n');
  console.log('| Endpoint | Requests | Errors | p50 | p95 | p99 |');
  console.log('|----------|----------|--------|-----|-----|-----|');
  
  Object.entries(byEndpoint).forEach(([name, data]) => {
    const p50 = percentile(data.durations, 50);
    const p95 = percentile(data.durations, 95);
    const p99 = percentile(data.durations, 99);
    console.log(`| /${name} | ${data.durations.length} | ${data.errors} | ${p50}ms | ${p95}ms | ${p99}ms |`);
  });
  
  console.log('\n---\n');
  console.log('## Baseline Targets (SLA)\n');
  console.log('| Endpoint | p50 Target | p95 Target | p99 Target |');
  console.log('|----------|------------|------------|------------|');
  console.log('| GET /health | < 20ms | < 50ms | < 100ms |');
  console.log('| GET /api/v1/skills | < 100ms | < 200ms | < 500ms |');
  console.log('| GET /api/v1/oauth/* | < 100ms | < 200ms | < 500ms |');
  console.log('| GET /api/v1/agent/* | < 100ms | < 200ms | < 500ms |');
  console.log('| GET /api/v1/billing/* | < 100ms | < 200ms | < 500ms |');
  console.log('| GET /api/v1/rag/* | < 200ms | < 500ms | < 1000ms |');
  console.log('| POST /api/v1/configurations | < 100ms | < 200ms | < 500ms |');
  
  console.log('\n---\n');
  console.log(`**Generated:** ${new Date().toISOString()}\n`);
  
  return {
    totalRequests,
    errorRate: parseFloat(errorRate),
    p50: percentile(allDurations, 50),
    p95: percentile(allDurations, 95),
    p99: percentile(allDurations, 99),
    byEndpoint,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const requests = parseInt(args[0]) || 100;
  const concurrency = parseInt(args[1]) || 10;
  
  console.log('==========================================');
  console.log('  TAIS Platform Load Test');
  console.log('==========================================');
  
  const results = await runLoadTest(requests, concurrency);
  const summary = generateReport(results);
  
  process.exit(summary.errorRate > 5 ? 1 : 0);
}

main().catch(console.error);
