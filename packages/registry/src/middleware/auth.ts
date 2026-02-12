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
    try {
      const authHeader = req.headers.authorization;
      const token = authService.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'No token provided. Please login first.'
        });
      }

      const decoded = authService.validateToken(token);
      req.user = { walletAddress: decoded.walletAddress };

      next();
    } catch (error) {
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
