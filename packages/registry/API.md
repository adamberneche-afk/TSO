# TAIS Registry API Documentation

## Overview

Welcome to the TAIS (Trustworthy AI Skills) Registry API! This API provides a secure, decentralized registry for AI agent skills with built-in security scanning, trust verification, and blockchain-based provenance.

## Quick Start

### 1. Get API Access

```bash
# Sign up for an API key
curl -X POST https://api.tais.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "walletAddress": "0x..."
  }'
```

### 2. Make Your First Request

```bash
# List all skills
curl https://api.tais.ai/api/skills \
  -H "X-API-Key: your_api_key"
```

### 3. Interactive Documentation

Visit `/api/docs` on any running registry server for interactive Swagger UI documentation.

## Base URL

```
Production:  https://api.tais.ai
Development: http://localhost:3000
```

## Authentication

The API supports two authentication methods:

### API Key (Recommended for server-to-server)

```bash
curl https://api.tais.ai/api/skills \
  -H "X-API-Key: tais_live_abc123..."
```

### JWT Token (Recommended for user-facing apps)

```bash
# 1. Login with wallet
curl -X POST https://api.tais.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x...",
    "signature": "0x...",
    "message": "Login to TAIS"
  }'

# 2. Use JWT token
curl https://api.tais.ai/api/skills \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Rate Limiting

| Tier | Requests | Window |
|------|----------|--------|
| Free | 100 | 15 minutes |
| Basic | 1,000 | 15 minutes |
| Pro | 10,000 | 15 minutes |
| Enterprise | Custom | Custom |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1644000000
```

## Core Concepts

### Skills

A skill is a package of code that can be installed and executed by AI agents. Each skill includes:

- **Manifest** - Metadata and permissions
- **Code** - Actual implementation
- **Provenance** - Trust chain and audits

### Trust Score

Trust scores range from 0.0 to 1.0 based on:

- Author reputation
- Community audits
- Security scan results
- Provenance verification

### Security Scanning

All skills are automatically scanned using YARA rules for:

- Credential theft
- Data exfiltration
- Malicious domains
- Process injection
- Suspicious imports
- Obfuscated code

## API Endpoints

### Skills

#### List Skills
```http
GET /api/skills
```

**Query Parameters:**
- `limit` (integer): Items per page (default: 20, max: 100)
- `offset` (integer): Items to skip (default: 0)
- `q` (string): Search query
- `category` (string): Filter by category
- `minTrustScore` (float): Minimum trust score (0.0 - 1.0)
- `status` (string): Filter by status (PENDING, APPROVED, REJECTED)

**Example:**
```bash
curl "https://api.tais.ai/api/skills?limit=10&minTrustScore=0.8"
```

**Response:**
```json
{
  "skills": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "skillHash": "0x1234...",
      "name": "weather-api",
      "version": "1.2.0",
      "description": "Get weather data from multiple sources",
      "author": "0x742d...",
      "trustScore": 0.85,
      "downloadCount": 1523,
      "status": "APPROVED",
      "createdAt": "2024-02-01T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Skill
```http
GET /api/skills/{skillHash}
```

**Example:**
```bash
curl https://api.tais.ai/api/skills/0x1234...
```

#### Register Skill
```http
POST /api/skills
```

**Request Body:**
```json
{
  "skillHash": "0x1234...",
  "name": "weather-api",
  "version": "1.0.0",
  "description": "Get weather data",
  "author": "0x742d...",
  "manifestCid": "Qm...",
  "packageCid": "Qm...",
  "permissions": {
    "network": {
      "domains": ["api.openweathermap.org"]
    },
    "filesystem": {
      "read": ["/tmp"],
      "write": []
    },
    "env_vars": ["WEATHER_API_KEY"],
    "modules": ["axios"]
  }
}
```

#### Download Skill
```http
GET /api/skills/{skillHash}/download
```

Returns download URL and metadata.

### Audits

#### Submit Audit
```http
POST /api/audits
```

**Request Body:**
```json
{
  "skillHash": "0x1234...",
  "auditor": "0x9876...",
  "status": "SAFE",
  "findings": [
    {
      "rule": "credential_theft",
      "severity": "critical",
      "evidence": "Access to .env file detected"
    }
  ],
  "signature": "0x..."
}
```

#### Get Skill Audits
```http
GET /api/audits/skill/{skillHash}
```

### Security Scanning

#### Scan Skill Package
```http
POST /api/scan
Content-Type: multipart/form-data
```

**Parameters:**
- `package` (file): Skill package file (.zip)
- `skillHash` (string): Skill hash

**Example:**
```bash
curl -X POST https://api.tais.ai/api/scan \
  -F "package=@skill.zip" \
  -F "skillHash=0x1234..." \
  -H "X-API-Key: your_api_key"
```

#### Get Scan Results
```http
GET /api/scan/{skillHash}
```

#### Get Security Report
```http
GET /api/scan/{skillHash}/report
```

### Search

#### Search Skills
```http
GET /api/search?q={query}
```

**Example:**
```bash
curl "https://api.tais.ai/api/search?q=weather&limit=5"
```

#### Get Trending
```http
GET /api/search/trending
```

### Monitoring

#### Get Metrics
```http
GET /monitoring/metrics
```

Returns Prometheus-compatible metrics.

#### Get Dashboard
```http
GET /api/monitoring/dashboard
```

Returns real-time health and statistics.

#### Get Performance
```http
GET /api/monitoring/performance
```

## Error Handling

Errors follow RFC 7807 (Problem Details):

```json
{
  "type": "https://api.tais.ai/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Skill with hash 0xabc123 not found",
  "instance": "/api/skills/0xabc123"
}
```

### Common Error Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @think/registry-sdk
```

```typescript
import { TAISRegistry } from '@think/registry-sdk';

const client = new TAISRegistry({
  apiKey: 'your_api_key'
});

// List skills
const skills = await client.skills.list({
  limit: 10,
  minTrustScore: 0.8
});

// Register a skill
const skill = await client.skills.register({
  skillHash: '0x1234...',
  name: 'weather-api',
  version: '1.0.0',
  // ...
});
```

### Python

```bash
pip install tais-registry
```

```python
from tais_registry import TAISRegistry

client = TAISRegistry(api_key="your_api_key")

# List skills
skills = client.skills.list(limit=10, min_trust_score=0.8)

# Register a skill
skill = client.skills.register(
    skill_hash="0x1234...",
    name="weather-api",
    version="1.0.0",
    # ...
)
```

### cURL Examples

See our [Postman collection](./TAIS-Registry.postman_collection.json) for complete examples.

## Webhooks

Subscribe to real-time events:

```bash
curl -X POST https://api.tais.ai/api/webhooks \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["skill.registered", "audit.submitted"],
    "secret": "webhook_secret"
  }'
```

### Webhook Events

- `skill.registered` - New skill registered
- `skill.approved` - Skill approved
- `skill.blocked` - Skill blocked by community
- `audit.submitted` - New audit submitted
- `scan.completed` - Security scan completed

## Best Practices

### 1. Handle Pagination

Always check for `hasMore` and implement pagination:

```javascript
let offset = 0;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`/api/skills?offset=${offset}`);
  const data = await response.json();
  
  // Process skills
  processSkills(data.skills);
  
  hasMore = data.pagination.hasMore;
  offset += data.pagination.limit;
}
```

### 2. Implement Retry Logic

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // Don't retry on 4xx errors
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### 3. Cache Responses

```javascript
const cache = new Map();

async function getSkill(skillHash) {
  if (cache.has(skillHash)) {
    return cache.get(skillHash);
  }
  
  const response = await fetch(`/api/skills/${skillHash}`);
  const skill = await response.json();
  
  // Cache for 5 minutes
  cache.set(skillHash, skill);
  setTimeout(() => cache.delete(skillHash), 5 * 60 * 1000);
  
  return skill;
}
```

### 4. Handle Rate Limits

```javascript
async function makeRequest(url, options) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = resetTime * 1000 - Date.now();
    
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
      return makeRequest(url, options); // Retry
    }
  }
  
  return response;
}
```

## Changelog

### v1.0.0 (2024-02-05)
- Initial release
- Skills management
- Security scanning with YARA
- Trust scoring
- Monitoring and metrics

## Support

- **Documentation**: https://docs.tais.ai
- **API Status**: https://status.tais.ai
- **Support Email**: support@tais.ai
- **Discord**: https://discord.gg/tais

## License

This API is licensed under the MIT License.

---

**Last Updated:** February 5, 2026
**API Version:** 1.0.0