import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';

// Squad Gamma - Infrastructure & Security
import { getCorsConfig } from './config/cors';
import { createSecurityHeaders } from './config/security';
import { requestIdMiddleware } from './middleware/requestId';

// Squad Alpha - Authentication
import { AuthService } from './services/auth';
import { ApiKeyService } from './services/apiKey';
import { authenticateToken } from './middleware/auth';
import { createAdminMiddleware } from './middleware/admin';

// Squad Beta - Access Control & Validation
import { NFTVerificationService } from './services/nftVerification';
import { rateLimiters } from './middleware/rateLimit';
import { requirePublisherNFT, requireAuditorNFT } from './middleware/nftAuth';

// Routes
import { skillRoutes } from './routes/skills';
import { authRoutes } from './routes/auth';
import { auditRoutes } from './routes/audits';
import { searchRoutes } from './routes/search';
import { adminRoutes } from './routes/admin';
import { healthRoutes } from './routes/health';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Import database configuration
import { createRAGPrismaClient, createSkillsPrismaClient } from './config/database';

// Initialize databases with connection pooling
// Supports dual-database architecture: RAG database (tais-rag) and Skills database (tais_registry)
const ragPrisma = createRAGPrismaClient(logger);
const skillsPrisma = createSkillsPrismaClient(logger);

// Legacy single client for backward compatibility
const prisma = process.env.RAG_DATABASE_URL && process.env.SKILLS_DATABASE_URL 
  ? ragPrisma  // Use RAG client as default when both are configured
  : new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

// Squad Zeta Fix: Configure trust proxy for IP spoofing prevention
const trustedProxies = process.env.TRUSTED_PROXIES?.split(',') || false;

// Initialize services
const authService = new AuthService(prisma, logger);
const apiKeyService = new ApiKeyService(prisma);
const nftService = new NFTVerificationService({
  publisherAddress: process.env.PUBLISHER_NFT_ADDRESS || process.env.GENESIS_CONTRACT || '',
  auditorAddress: process.env.AUDITOR_NFT_ADDRESS || process.env.GENESIS_CONTRACT || '',
  rpcUrl: process.env.RPC_URL || 'https://cloudflare-eth.com'
}, logger);

// Create middleware instances
const authMiddleware = authenticateToken(authService);
const adminMiddleware = createAdminMiddleware();
const publisherNftMiddleware = requirePublisherNFT(nftService);
const auditorNftMiddleware = requireAuditorNFT(nftService);

// Initialize Express app
const app = express();

// Squad Zeta Fix: Configure trust proxy before any middleware
app.set('trust proxy', trustedProxies);

// Squad Gamma: Request ID middleware (first to track all requests)
app.use(requestIdMiddleware);

// Squad Gamma: Security headers
app.use(createSecurityHeaders());

// Squad Gamma: CORS configuration
const corsConfig = getCorsConfig();
app.use(cors(corsConfig));

// Squad Gamma: Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Squad Gamma: Request logging
app.use((req: any, res: any, next: any) => {
  req.prisma = prisma;
  req.log = logger.child({ requestId: req.id });
  
  req.log.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }, 'Incoming request');
  
  next();
});

// Squad Gamma: Request timing middleware
app.use((req: any, res: any, next: any) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    req.log.info({
      duration,
      statusCode: res.statusCode,
      method: req.method,
      path: req.path
    }, 'Request completed');
  });
  
  next();
});

// Squad Gamma: API version header on all responses
app.use((req: any, res: any, next: any) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

// ============================================
// SQUAD DELTA CRITICAL FIX: Middleware Chain Utility
// Properly applies multiple middleware in sequence
// ============================================

const applyMiddlewareChain = (middlewares: any[]) => {
  return (req: any, res: any, next: any) => {
    let index = 0;
    
    const runNext = (err?: any) => {
      if (err) return next(err);
      if (index >= middlewares.length) return next();
      const middleware = middlewares[index++];
      try {
        middleware(req, res, runNext);
      } catch (error) {
        next(error);
      }
    };
    
    runNext();
  };
};

// ============================================
// ROUTE MOUNTING WITH SECURITY MIDDLEWARE
// ============================================

// Health check (unversioned, no auth)
app.use('/health', healthRoutes);

// API v1 Routes
const apiV1Router = express.Router();

// Squad Beta: Apply standard rate limiting to all API routes
apiV1Router.use(rateLimiters.standard);

// Squad THETA Fix: LOW-1 - API Key middleware for programmatic access
import { apiKeyMiddleware } from './middleware/apiKey';
apiV1Router.use(apiKeyMiddleware(apiKeyService));

// Squad Alpha: Auth routes with strict rate limiting for login
// Squad KAPPA Fix: INFO-3 - IP-based rate limiting for failed auth attempts
apiV1Router.use('/auth', rateLimiters.auth, authRoutes);

// Squad Beta: Search routes (public, optional auth)
apiV1Router.use('/search', searchRoutes);

// Squad Delta CRITICAL FIX: Skills routes with FULL security
// POST /skills now requires: rate limit -> auth -> publisher NFT
apiV1Router.use('/skills', 
  (req: any, res: any, next: any) => {
    if (req.method === 'POST') {
      // CRITICAL FIX: Apply middleware chain for POST requests
      return applyMiddlewareChain([
        rateLimiters.strict,
        authMiddleware,
        publisherNftMiddleware
      ])(req, res, next);
    }
    next();
  },
  skillRoutes
);

// Squad Delta CRITICAL FIX: Audit routes with FULL security
// POST /audits now requires: rate limit -> auth -> auditor NFT
apiV1Router.use('/audits',
  (req: any, res: any, next: any) => {
    if (req.method === 'POST') {
      // CRITICAL FIX: Apply middleware chain for POST requests
      return applyMiddlewareChain([
        rateLimiters.strict,
        authMiddleware,
        auditorNftMiddleware
      ])(req, res, next);
    }
    next();
  },
  auditRoutes
);

// Squad Alpha: Admin routes (protected)
apiV1Router.use('/admin',
  authMiddleware,
  adminMiddleware,
  rateLimiters.authenticated,
  adminRoutes
);

// Genesis Holder: Agent configuration persistence routes
import configurationRoutes from './routes/configurations';
apiV1Router.use('/configurations',
  authMiddleware,
  rateLimiters.authenticated,
  configurationRoutes
);

// Admin-only migration endpoint for v2.7.0 hybrid config
import migrateRoutes from './routes/migrate';
apiV1Router.use('/admin/migrate',
  adminMiddleware,
  migrateRoutes
);

// ============================================
// RAG (Retrieval-Augmented Generation) Routes
// Three-tier RAG: Private, Platform, App
// Uses separate RAG database (tais-rag)
// ============================================
import { createRAGRoutes } from './routes/rag';
import { createSessionRoutes } from './services/ragSession';

// RAG session management (for streamlined uploads)
apiV1Router.use('/rag/session', createSessionRoutes(prisma, logger));

// RAG routes with tier-based rate limiting
// Uses ragPrisma for RAG-specific database operations
apiV1Router.use('/rag',
  rateLimiters.authenticated, // Apply rate limiting to all RAG routes
  createRAGRoutes(ragPrisma, logger)
);

// ============================================
// SDK Authentication Routes
// Wallet signature auth for third-party developers
// Requires Gold tier (Genesis NFT holder)
// ============================================
import { createSDKAuthRoutes } from './routes/sdkAuth';

apiV1Router.use('/sdk/auth', createSDKAuthRoutes(prisma, logger));

// ============================================
// Monitoring & Observability Routes
// Prometheus metrics, health dashboard, alerts
// ============================================
import { monitoringRoutes } from './routes/monitoring';
import { metricsMiddleware } from './monitoring/metrics';

// Apply metrics middleware to all API routes
apiV1Router.use(metricsMiddleware);

// Monitoring routes (unversioned, accessible at /monitoring)
app.use('/monitoring', monitoringRoutes);

// Admin migration fix endpoint (run once to fix failed migrations)
import { migrationFixRoutes } from './routes/migrationFix';
app.use('/admin/migration', adminMiddleware, migrationFixRoutes);

// Mount API v1 router
app.use('/api/v1', apiV1Router);

// Squad Gamma: API versioning - redirect /api to /api/v1 for backward compatibility
app.use('/api', (req: any, res: any, next: any) => {
  req.url = '/api/v1' + req.url;
  next();
}, apiV1Router);

// Squad Beta: Error handling middleware
app.use((err: any, req: any, res: Response, next: NextFunction) => {
  // Log full error
  req.log.error({
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  }, 'Error occurred');

  // Squad Beta: Sanitize error messages in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: isProduction ? undefined : err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  // Generic error response
  res.status(err.statusCode || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    requestId: req.id
  });
});

// Squad Gamma: 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource does not exist',
    path: req.path
  });
});

// Start server only when run directly (not when imported for tests)
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    logger.info('==========================================');
    logger.info('🚀 TAIS Platform API Server Started');
    logger.info('==========================================');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Port: ${PORT}`);
    logger.info(`API Version: v1`);
    logger.info(`CORS Origins: ${corsConfig.origin.join(', ')}`);
    logger.info(`Trust Proxy: ${trustedProxies || 'disabled'}`);
    
    // Database configuration info
    const usingDualDb = process.env.RAG_DATABASE_URL && process.env.SKILLS_DATABASE_URL;
    logger.info('==========================================');
    if (usingDualDb) {
      logger.info('Database Configuration: Dual-Database Mode');
      logger.info('  📁 RAG Database: tais-rag (Public RAG documents)');
      logger.info('  📁 Skills Database: tais_registry (Skills & auth)');
    } else {
      logger.info('Database Configuration: Single-Database Mode');
      logger.info(`  📁 Database: ${process.env.DATABASE_URL?.includes('tais-rag') ? 'tais-rag' : 'tais_registry'}`);
    }
    
    logger.info('==========================================');
    logger.info('Security Status:');
    logger.info('  ✅ JWT Authentication: Active');
    logger.info('  ✅ NFT Verification: Active (Fail-Closed)');
    logger.info('  ✅ Rate Limiting: Active');
    logger.info('  ✅ CORS Protection: Active');
    logger.info('  ✅ Security Headers: Active');
    logger.info('  ✅ Input Validation: Active');
    logger.info('  ✅ Trust Proxy: Configured');
    logger.info('==========================================');
  });
}

// Squad Gamma: Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  logger.info('Disconnecting from databases...');
  await ragPrisma.$disconnect();
  await skillsPrisma.$disconnect();
  logger.info('✅ All database connections closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  logger.info('Disconnecting from databases...');
  await ragPrisma.$disconnect();
  await skillsPrisma.$disconnect();
  logger.info('✅ All database connections closed');
  process.exit(0);
});

export default app;
