import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';

/**
 * Authentication Middleware
 * Squad Alpha - Provides JWT validation for protected routes
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
  };
}

/**
 * Validate JWT token middleware
 * Attaches user object to request if valid
 */
export const authenticateToken = (
  authService: AuthService
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('[AUTH] Middleware called for path:', req.path);
    console.log('[AUTH] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    try {
      const authHeader = req.headers.authorization;
      const token = authService.extractTokenFromHeader(authHeader);

      if (!token) {
        console.log('[AUTH] ❌ No token found in header');
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'No token provided. Please login first.'
        });
      }

      console.log('[AUTH] Token extracted, validating...');
      const decoded = authService.validateToken(token);
      console.log('[AUTH] ✅ Token valid, wallet:', decoded.walletAddress);
      req.user = { walletAddress: decoded.walletAddress };

      next();
    } catch (error) {
      console.log('[AUTH] ❌ Token validation failed:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
export const optionalAuth = (
  authService: AuthService
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authService.extractTokenFromHeader(authHeader);

      if (token) {
        const decoded = authService.validateToken(token);
        req.user = { walletAddress: decoded.walletAddress };
      }

      next();
    } catch {
      // Invalid token, but optional so continue
      next();
    }
  };
};

export default authenticateToken;
