import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey';

/**
 * API Key Middleware - Squad THETA
 * Implements LOW-1: API Key validation on protected routes
 */

export interface ApiKeyRequest extends Request {
  user?: {
    walletAddress: string;
  };
  apiKey?: string;
}

/**
 * Validate API Key middleware
 * Checks for X-API-Key header and validates it
 * Falls back to JWT authentication if no API key provided
 */
export const apiKeyMiddleware = (apiKeyService: ApiKeyService) => {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      // If no API key provided, allow JWT middleware to handle auth
      if (!apiKey) {
        return next();
      }
      
      // Validate the API key
      const validation = await apiKeyService.validateKey(apiKey);
      
      if (!validation.valid) {
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is invalid or has expired'
        });
      }
      
      // Attach user info from API key to request
      req.user = { walletAddress: validation.walletAddress! };
      req.apiKey = apiKey;
      
      // Log API key usage
      (req as any).log?.info({
        walletAddress: validation.walletAddress,
        apiKey: apiKey.substring(0, 10) + '...', // Log partial key for security
        path: req.path,
        method: req.method
      }, 'API key authentication successful');
      
      next();
    } catch (error) {
      (req as any).log?.error({ error }, 'API key validation error');
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'Unable to validate API key'
      });
    }
  };
};

/**
 * Require API Key or JWT middleware
 * Ensures either API key or JWT authentication is present
 */
export const requireApiKeyOrAuth = () => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'This endpoint requires either an API key or JWT token'
      });
    }
    next();
  };
};

export default apiKeyMiddleware;
