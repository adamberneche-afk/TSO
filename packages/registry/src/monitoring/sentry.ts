import { init, configureScope, captureException, captureMessage, withScope } from '@sentry/node';
import type { Express } from 'express';

export function initializeSentry(app: Express): void {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [],

    // Set user context
    beforeSend(event) {
      // Don't send sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'PrismaClientInitializationError',
    ],
  });

  // Configure scope with additional context
  configureScope((scope) => {
    scope.setTag('service', 'tais-registry');
    scope.setTag('version', process.env.npm_package_version || '1.0.0');
    
    if (process.env.RAILWAY_SERVICE_NAME) {
      scope.setTag('deployment', process.env.RAILWAY_SERVICE_NAME);
    }
  });

  console.log('✅ Sentry initialized for error tracking');
}

export function setupRequestHandler(app: Express): void {
  if (!process.env.SENTRY_DSN) return;
  
  // The request handler must be the first middleware
  app.use((req, res, next) => {
    // Add request context
    configureScope((scope) => {
      scope.setContext('request', {
        url: req.url,
        method: req.method,
        headers: {
          'user-agent': req.headers['user-agent'],
        },
      });
    });
    next();
  });
}

export function setupErrorHandler(app: Express): void {
  if (!process.env.SENTRY_DSN) return;
  
  // The error handler must be before any other error middleware
  app.use((err: any, req: any, res: any, next: any) => {
    withScope((scope) => {
      // Add extra context
      scope.setExtra('url', req.url);
      scope.setExtra('method', req.method);
      scope.setExtra('query', req.query);
      scope.setExtra('body', req.body);
      
      // Capture error
      captureException(err);
    });
    
    next(err);
  });
}

export function trackPerformance(name: string, data?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) return;
  
  captureMessage(`Performance: ${name}`, {
    level: 'info',
    extra: data,
  });
}

export function trackBusinessEvent(event: string, data?: Record<string, any>): void {
  if (!process.env.SENTRY_DSN) return;
  
  captureMessage(`Business: ${event}`, {
    level: 'info',
    tags: { event_type: 'business' },
    extra: data,
  });
}

export { captureException, captureMessage };