import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * Squad Gamma - LOW-3: Request tracing for debugging and logging
 */

export interface RequestWithId extends Request {
  id?: string;
}

/**
 * Attach unique request ID to each request
 * Enables distributed tracing and correlation
 */
export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  // Check if client provided a request ID (for distributed tracing)
  const clientRequestId = req.headers['x-request-id'];
  
  // Generate new ID or use client-provided one
  const requestId = typeof clientRequestId === 'string' && clientRequestId.length > 0
    ? clientRequestId
    : uuidv4();

  // Attach to request object
  req.id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  // Add to logs if logger exists
  if ((req as any).log) {
    (req as any).log = (req as any).log.child({ requestId });
  }

  next();
};

/**
 * Create a child logger with request context
 */
export const createRequestLogger = (
  req: RequestWithId,
  baseLogger: any
) => {
  return baseLogger.child({
    requestId: req.id,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
};

export default requestIdMiddleware;
