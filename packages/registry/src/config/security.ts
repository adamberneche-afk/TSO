import helmet from 'helmet';

/**
 * Security Headers Configuration
 * Squad Gamma - LOW-1: Security headers with CSP and HSTS
 */

/**
 * Create Helmet middleware with secure defaults
 */
export const createSecurityHeaders = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Allow inline scripts in development for debugging
          ...(isProduction ? [] : ["'unsafe-inline'"])
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'"  // Required for styled-components/emotion
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:'
        ],
        connectSrc: [
          "'self'",
          // Allow connections to blockchain RPC
          'https://cloudflare-eth.com',
          'https://*.alchemy.com',
          'https://*.infura.io'
        ],
        fontSrc: [
          "'self'",
          'data:'
        ],
        objectSrc: ["'none'"],  // Disallow Flash, etc.
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],   // Disallow iframes
        upgradeInsecureRequests: isProduction ? ([] as string[]) : null,
      },
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000,        // 1 year
      includeSubDomains: true,
      preload: true
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS Protection header
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false,  // Allow embedded resources
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // Frame Options (legacy but still useful)
    frameguard: {
      action: 'deny'
    },

    // Hide X-Powered-By
    hidePoweredBy: true,

    // IE No Open
    ieNoOpen: true,

    // Origin Agent Cluster
    originAgentCluster: true
  });
};

/**
 * Additional security middleware for specific routes
 */
export const strictSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

export default createSecurityHeaders;
