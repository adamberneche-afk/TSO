import cors from 'cors';

/**
 * CORS Configuration
 * Squad Gamma - HIGH-4: Production-safe CORS configuration
 */

export interface CORSConfig {
  origin: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

/**
 * Get CORS configuration based on environment
 * CRITICAL: Production must explicitly set CORS_ORIGIN
 */
export const getCorsConfig = (): CORSConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Development defaults
  const devOrigins = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Alternative
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  // Production origins must be explicitly set
  const prodOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];

  if (isProduction && prodOrigins.length === 0) {
    throw new Error(
      'CORS_ORIGIN environment variable is required in production. ' +
      'Set it to your frontend domain(s), e.g., https://yourapp.vercel.app'
    );
  }

  const allowedOrigins = isProduction ? prodOrigins : devOrigins;

  // Squad Gamma: Console logs are acceptable for startup configuration
  console.log(`🔒 CORS configured for ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Wallet-Address',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 86400 // 24 hours
  };
};

/**
 * Create CORS middleware
 */
export const createCorsMiddleware = () => {
  const config = getCorsConfig();
  return cors(config);
};

export default getCorsConfig;
