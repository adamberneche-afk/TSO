import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TAIS Skill Registry API',
      version: '1.0.0',
      description: `
## Overview

The TAIS Skill Registry API provides a comprehensive interface for managing, discovering, and securing AI agent skills. This API enables:

- **Skill Management** - Register, update, and manage skills with metadata
- **Security Scanning** - Automated YARA-based security analysis
- **Trust & Verification** - Blockchain-based provenance and trust scoring
- **Monitoring** - Real-time metrics and health monitoring
- **Search & Discovery** - Find skills by category, trust score, or keywords

## Base URL

\`\`\`
Production: https://api.tais.ai/v1
Development: http://localhost:3000
\`\`\`

## Authentication

Most endpoints require authentication via JWT tokens or API keys:

\`\`\`
Authorization: Bearer <jwt_token>
or
X-API-Key: <api_key>
\`\`\`

## Rate Limiting

- Free tier: 100 requests per 15 minutes
- Pro tier: 1,000 requests per 15 minutes
- Enterprise: Custom limits

## Response Format

All responses follow a standard format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-02-05T20:00:00Z",
    "requestId": "req_123"
  }
}
\`\`\`

## Error Handling

Errors follow RFC 7807 (Problem Details):

\`\`\`json
{
  "type": "https://api.tais.ai/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "The request body is malformed",
  "instance": "/api/skills"
}
\`\`\`

## SDKs

- **JavaScript/TypeScript**: \`npm install @think/registry-sdk\`
- **Python**: \`pip install tais-registry\`
- **Go**: \`go get github.com/think/registry-go\`

      `,
      contact: {
        name: 'TAIS Support',
        email: 'support@tais.ai',
        url: 'https://docs.tais.ai',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.tais.ai',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Skills',
        description: 'Skill registration, management, and retrieval',
      },
      {
        name: 'Audits',
        description: 'Community security audits and reporting',
      },
      {
        name: 'Search',
        description: 'Skill discovery and search functionality',
      },
      {
        name: 'Security',
        description: 'YARA-based security scanning',
      },
      {
        name: 'Monitoring',
        description: 'Health checks, metrics, and dashboards',
      },
      {
        name: 'Authentication',
        description: 'API keys and authentication',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access',
        },
      },
      schemas: {
        Skill: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier',
            },
            skillHash: {
              type: 'string',
              description: 'SHA-256 hash of skill manifest',
              example: '0x1234567890abcdef...',
            },
            name: {
              type: 'string',
              description: 'Skill name',
              example: 'weather-api',
            },
            version: {
              type: 'string',
              description: 'Semantic version',
              example: '1.2.0',
            },
            description: {
              type: 'string',
              description: 'Skill description',
            },
            author: {
              type: 'string',
              description: 'Ethereum wallet address of author',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            },
            manifestCid: {
              type: 'string',
              description: 'IPFS CID of manifest',
            },
            packageCid: {
              type: 'string',
              description: 'IPFS CID of skill package',
            },
            permissions: {
              type: 'object',
              description: 'Requested permissions',
            },
            trustScore: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              description: 'Trust score (0.0 - 1.0)',
            },
            downloadCount: {
              type: 'integer',
              description: 'Number of downloads',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
            },
            isBlocked: {
              type: 'boolean',
              description: 'Whether skill is blocked by community',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'skillHash', 'name', 'version', 'author', 'manifestCid'],
        },
        Audit: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            skillId: {
              type: 'string',
              format: 'uuid',
            },
            auditor: {
              type: 'string',
              description: 'Auditor wallet address',
            },
            auditorNft: {
              type: 'string',
              description: 'Auditor NFT token ID',
            },
            status: {
              type: 'string',
              enum: ['SAFE', 'SUSPICIOUS', 'MALICIOUS'],
            },
            findings: {
              type: 'array',
              items: {
                type: 'object',
              },
              description: 'YARA findings',
            },
            signature: {
              type: 'string',
              description: 'Cryptographic signature',
            },
            txHash: {
              type: 'string',
              description: 'Blockchain transaction hash',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'skillId', 'auditor', 'status', 'signature'],
        },
        SecurityScan: {
          type: 'object',
          properties: {
            skillHash: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            severity: {
              type: 'string',
              enum: ['safe', 'suspicious', 'malicious'],
            },
            findings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rule: { type: 'string' },
                  namespace: { type: 'string' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  meta: { type: 'object' },
                  strings: { type: 'array' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalRules: { type: 'integer' },
                matchedRules: { type: 'integer' },
                critical: { type: 'integer' },
                high: { type: 'integer' },
                medium: { type: 'integer' },
                low: { type: 'integer' },
              },
            },
            scanDuration: {
              type: 'integer',
              description: 'Scan duration in milliseconds',
            },
            scannedFiles: { type: 'integer' },
            scannedBytes: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              format: 'uri',
            },
            title: {
              type: 'string',
            },
            status: {
              type: 'integer',
            },
            detail: {
              type: 'string',
            },
            instance: {
              type: 'string',
            },
          },
          required: ['title', 'status'],
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            offset: {
              type: 'integer',
              description: 'Current offset',
            },
            hasMore: {
              type: 'boolean',
              description: 'Whether more pages exist',
            },
          },
        },
      },
      parameters: {
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items to return (max 100)',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        OffsetParam: {
          name: 'offset',
          in: 'query',
          description: 'Number of items to skip',
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
        },
        SkillHashParam: {
          name: 'skillHash',
          in: 'path',
          required: true,
          description: 'SHA-256 hash of skill manifest',
          schema: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{64}$',
          },
        },
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                type: 'https://api.tais.ai/errors/not-found',
                title: 'Not Found',
                status: 404,
                detail: 'Skill with hash 0xabc123 not found',
                instance: '/api/skills/0xabc123',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                type: 'https://api.tais.ai/errors/unauthorized',
                title: 'Unauthorized',
                status: 401,
                detail: 'Valid authentication credentials required',
                instance: '/api/skills',
              },
            },
          },
        },
        RateLimit: {
          description: 'Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Request limit per window',
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Requests remaining in window',
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Unix timestamp when limit resets',
            },
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                type: 'https://api.tais.ai/errors/rate-limit',
                title: 'Rate Limit Exceeded',
                status: 429,
                detail: 'Too many requests. Please try again later.',
                instance: '/api/skills',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to API routes
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TAIS Registry API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // Serve raw OpenAPI spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at /api/docs');
}

export { specs };