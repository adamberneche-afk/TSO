import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate Limiting Configuration
 * Squad Beta - HIGH-2: Enhanced rate limiting for different endpoint tiers
 */

// Extended request type with custom properties
interface RateLimitRequest extends Request {
  user?: { walletAddress: string };
  apiKey?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  keyGenerator?: (req: RateLimitRequest) => string;
}

/**
 * Standard tier - General API usage
 * 200 requests per 15 minutes
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as RateLimitRequest).user?.walletAddress || req.ip || 'anonymous';
  }
});

/**
 * Strict tier - Write operations (POST, PUT, DELETE)
 * 10 requests per minute
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many write operations. Please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as RateLimitRequest).user?.walletAddress || req.ip || 'anonymous';
  }
});

/**
 * Authentication tier - Login attempts
 * 5 requests per 15 minutes (prevent brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: {
    error: 'Too many login attempts',
    message: 'Please try again in 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req: RateLimitRequest) => {
    // Always use IP for auth to prevent wallet spoofing
    return req.ip || 'anonymous';
  }
});

/**
 * Authenticated user tier - Higher limits for logged-in users
 * 500 requests per 15 minutes
 */
export const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: {
    error: 'Rate limit exceeded',
    message: 'Daily limit reached. Please try again tomorrow.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Require authentication
    const r = req as RateLimitRequest;
    if (!r.user?.walletAddress) {
      return req.ip || 'anonymous';
    }
    return r.user.walletAddress;
  }
});

/**
 * API key tier - For programmatic access
 * 1000 requests per 15 minutes
 */
export const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    error: 'API rate limit exceeded',
    message: 'Daily API quota reached',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as RateLimitRequest).apiKey || req.ip || 'anonymous';
  }
});

/**
 * Export all rate limiters
 */
export const rateLimiters = {
  standard: standardLimiter,
  strict: strictLimiter,
  auth: authLimiter,
  authenticated: authenticatedLimiter,
  apiKey: apiKeyLimiter
};

export default rateLimiters;
