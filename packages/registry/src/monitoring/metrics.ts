import * as promClient from 'prom-client';
import { Request, Response } from 'express';

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'tais_',
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'tais_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'tais_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'tais_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: 'tais_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const dbErrorsTotal = new promClient.Counter({
  name: 'tais_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

const skillsRegistered = new promClient.Counter({
  name: 'tais_skills_registered_total',
  help: 'Total number of skills registered',
  labelNames: ['status'],
  registers: [register],
});

const auditsSubmitted = new promClient.Counter({
  name: 'tais_audits_submitted_total',
  help: 'Total number of audits submitted',
  labelNames: ['status'],
  registers: [register],
});

const downloadsTotal = new promClient.Counter({
  name: 'tais_skill_downloads_total',
  help: 'Total number of skill downloads',
  labelNames: ['skill_hash'],
  registers: [register],
});

const cacheHits = new promClient.Counter({
  name: 'tais_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

const cacheMisses = new promClient.Counter({
  name: 'tais_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// TAIS-specific metrics
const nftVerifications = new promClient.Counter({
  name: 'tais_nft_verifications_total',
  help: 'Total NFT verification attempts',
  labelNames: ['status', 'tier'],
  registers: [register],
});

const configSaves = new promClient.Counter({
  name: 'tais_config_saves_total',
  help: 'Total configuration saves',
  labelNames: ['status'],
  registers: [register],
});

const configUpdates = new promClient.Counter({
  name: 'tais_config_updates_total',
  help: 'Total configuration updates',
  labelNames: ['status'],
  registers: [register],
});

const ragUploads = new promClient.Counter({
  name: 'tais_rag_uploads_total',
  help: 'Total RAG document uploads',
  labelNames: ['type', 'tier'],
  registers: [register],
});

const ragQueries = new promClient.Counter({
  name: 'tais_rag_queries_total',
  help: 'Total RAG search queries',
  labelNames: ['type', 'status'],
  registers: [register],
});

const ragQueryDuration = new promClient.Histogram({
  name: 'tais_rag_query_duration_seconds',
  help: 'Duration of RAG queries in seconds',
  labelNames: ['type'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const rateLimitHits = new promClient.Counter({
  name: 'tais_rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['tier', 'endpoint'],
  registers: [register],
});

const walletAuths = new promClient.Counter({
  name: 'tais_wallet_authentications_total',
  help: 'Total wallet authentications',
  labelNames: ['status'],
  registers: [register],
});

const activeWallets = new promClient.Gauge({
  name: 'tais_active_wallets',
  help: 'Number of unique active wallets',
  registers: [register],
});

// Middleware to track HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: any) {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Track response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    
    // Decrement active connections
    activeConnections.dec();
  });
  
  next();
}

// Database metrics helpers
export function trackDbQuery(operation: string, table: string, duration: number) {
  dbQueryDuration.observe({ operation, table }, duration);
}

export function trackDbError(operation: string, errorType: string) {
  dbErrorsTotal.inc({ operation, error_type: errorType });
}

// Business metrics helpers
export function trackSkillRegistered(status: string) {
  skillsRegistered.inc({ status });
}

export function trackAuditSubmitted(status: string) {
  auditsSubmitted.inc({ status });
}

export function trackDownload(skillHash: string) {
  downloadsTotal.inc({ skill_hash: skillHash });
}

export function trackCacheHit(cacheType: string) {
  cacheHits.inc({ cache_type: cacheType });
}

export function trackCacheMiss(cacheType: string) {
  cacheMisses.inc({ cache_type: cacheType });
}

// TAIS-specific metrics helpers
export function trackNftVerification(status: 'success' | 'failure', tier: string = 'unknown') {
  nftVerifications.inc({ status, tier });
}

export function trackConfigSave(status: 'success' | 'failure') {
  configSaves.inc({ status });
}

export function trackConfigUpdate(status: 'success' | 'failure') {
  configUpdates.inc({ status });
}

export function trackRagUpload(type: 'public' | 'private', tier: string = 'bronze') {
  ragUploads.inc({ type, tier });
}

export function trackRagQuery(type: 'public' | 'private', status: 'success' | 'failure') {
  ragQueries.inc({ type, status });
}

export function trackRagQueryDuration(type: 'public' | 'private', duration: number) {
  ragQueryDuration.observe({ type }, duration);
}

export function trackRateLimitHit(tier: string, endpoint: string) {
  rateLimitHits.inc({ tier, endpoint });
}

export function trackWalletAuth(status: 'success' | 'failure') {
  walletAuths.inc({ status });
}

export function setActiveWallets(count: number) {
  activeWallets.set(count);
}

// Metrics endpoint
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export function getContentType(): string {
  return register.contentType;
}