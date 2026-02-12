/**
 * Safe Logging Utility
 * Squad Zeta - MEDIUM-3 Fix: Prevents uncaught promise rejections in logging
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Safely log a message with error handling
 * Prevents unhandled promise rejections when logging fails
 */
export function safeLog(
  req: any,
  level: LogLevel,
  message: string,
  meta?: Record<string, any>
): void {
  try {
    // Try to use structured logger if available
    if (req?.log && typeof req.log[level] === 'function') {
      req.log[level](meta || {}, message);
    } else if (req?.log && typeof req.log.log === 'function') {
      // Fallback to generic log method
      req.log.log(level, message, meta);
    } else {
      // Fallback to console
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, meta || '');
    }
  } catch (loggingError) {
    // If logging fails, use console as ultimate fallback
    try {
      console.error('Logging failed:', loggingError);
      console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    } catch {
      // Last resort - ignore the error to prevent crash
    }
  }
}

/**
 * Create a safe logger wrapper
 * Returns an object with safe logging methods
 */
export function createSafeLogger(req: any) {
  return {
    error: (message: string, meta?: Record<string, any>) => 
      safeLog(req, 'error', message, meta),
    warn: (message: string, meta?: Record<string, any>) => 
      safeLog(req, 'warn', message, meta),
    info: (message: string, meta?: Record<string, any>) => 
      safeLog(req, 'info', message, meta),
    debug: (message: string, meta?: Record<string, any>) => 
      safeLog(req, 'debug', message, meta)
  };
}

export default safeLog;
