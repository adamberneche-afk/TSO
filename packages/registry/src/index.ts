import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { createIPFSClient } from './services/ipfs';
import { skillRoutes } from './routes/skills';
import { auditRoutes } from './routes/audits';
import { searchRoutes } from './routes/search';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { monitoringRoutes } from './routes/monitoring';
import { scanRoutes } from './routes/scan';
import { adminRoutes } from './routes/admin';
import { setupSwagger } from './config/swagger';
import { initializeSentry, setupRequestHandler, setupErrorHandler } from './monitoring/sentry';
import { metricsMiddleware } from './monitoring/metrics';
import { AlertManager } from './monitoring/alerts';
import { nftVerification } from './services/nftVerification';

dotenv.config();

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize database
const prisma = new PrismaClient();

// Initialize IPFS client
const ipfs = createIPFSClient();

// Initialize NFT verification
const nftStatus = nftVerification.getStatus();
logger.info('NFT Verification status:', nftStatus);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // stricter limit for write operations
  message: { error: 'Rate limit exceeded for write operations' }
});

app.use('/api/', limiter);
app.use('/api/skills/upload', strictLimiter);
app.use('/api/audits/submit', strictLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Sentry
initializeSentry(app);
setupRequestHandler(app);

// Initialize Alert Manager
const alertManager = new AlertManager(logger);

// Metrics middleware
app.use(metricsMiddleware);

// Attach services to request
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  (req as any).ipfs = ipfs;
  (req as any).logger = logger;
  (req as any).alertManager = alertManager;
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/admin', adminRoutes);

// Setup Swagger documentation
setupSwagger(app);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TAIS Skill Registry',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      skills: '/api/skills',
      audits: '/api/audits',
      search: '/api/search',
      auth: '/api/auth',
      monitoring: '/api/monitoring',
      scan: '/api/scan',
      admin: '/api/admin'
    }
  });
});

// Sentry error handler (must be before other error handlers)
setupErrorHandler(app);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`TAIS Registry Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`IPFS enabled: ${process.env.IPFS_ENABLED === 'true'}`);
});

export { app, prisma, logger };