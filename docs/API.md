# TAIS API Reference

Complete API reference for the TAIS Cross-App Agent Portability platform.

## Base URL

```
Production: https://tso.onrender.com/api/v1
```

## Authentication

### OAuth Authorization

#### GET /oauth/authorize

Initiates OAuth flow by returning authorization URL and pending authorization details.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| app_id | string | Yes | Your app's ID |
| scopes | string | Yes | Comma-separated scope list |
| redirect_uri | string | Yes | OAuth callback URL |
| wallet | string | Yes | User's wallet address |
| state | string | No | CSRF token |

**Response:**
```json
{
  "authorizationId": "auth_abc123",
  "app": {
    "name": "My App",
    "description": "AI assistant for Notion",
    "requestedScopes": ["agent:identity:read", "agent:memory:read"]
  },
  "message": "Authorization pending wallet signature"
}
```

#### POST /oauth/approve

Approves authorization with wallet signature.

**Body:**
```json
{
  "authorizationId": "auth_abc123",
  "wallet": "0x1234...",
  "signature": "0xabcd..."
}
```

**Response:**
```json
{
  "success": true,
  "redirectUri": "https://myapp.com/callback?code=..."
}
```

#### POST /oauth/token

Exchanges authorization code for access token.

**Body:**
```json
{
  "grant_type": "authorization_code",
  "code": "tais_at_...",
  "app_id": "my-app",
  "app_secret": "secret123"
}
```

**Response:**
```json
{
  "access_token": "tais_at_xyz...",
  "refresh_token": "tais_rt_xyz...",
  "token_type": "Bearer",
  "expires_in": 2592000,
  "walletAddress": "0x1234...",
  "scopes": ["agent:identity:read"]
}
```

#### POST /oauth/revoke

Revokes access token.

**Body:**
```json
{
  "access_token": "tais_at_...",
  "wallet": "0x1234...",
  "app_id": "my-app"
}
```

#### GET /oauth/permissions

Lists user's granted permissions.

**Query:** `?wallet=0x1234&app_id=my-app`

**Response:**
```json
{
  "permissions": [
    {
      "appId": "my-app",
      "appName": "My App",
      "scopes": ["agent:identity:read", "agent:memory:read"],
      "grantedAt": "2026-02-27T10:00:00Z",
      "expiresAt": "2026-03-27T10:00:00Z"
    }
  ]
}
```

### App Registration

#### POST /oauth/register-app

Registers a new application.

**Body:**
```json
{
  "appId": "my-app",
  "name": "My Application",
  "description": "AI assistant for productivity",
  "redirectUris": ["https://myapp.com/callback"],
  "wallet": "0x1234...",
  "signature": "0xabcd...",
  "websiteUrl": "https://myapp.com",
  "developerEmail": "dev@myapp.com",
  "developerName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "app": {
    "appId": "my-app",
    "name": "My Application",
    "appSecret": "secret123...",
    "tier": "BASIC",
    "redirectUris": ["https://myapp.com/callback"]
  },
  "message": "Save your app secret securely. It will not be shown again."
}
```

## Agent Context

### GET /agent/context

Retrieves agent configuration and context.

**Headers:** `Authorization: Bearer {access_token}`

**Response:**
```json
{
  "agentId": "config_abc123",
  "walletAddress": "0x1234...",
  "tier": "gold",
  "config": {
    "name": "My Agent",
    "soul": "# Agent Personality\n\nYou are helpful...",
    "profile": "# User Profile\n\nPreferences...",
    "memory": "- User prefers bullet points\n- Focus on technical topics"
  },
  "permissions": {
    "scopes": ["agent:identity:read", "agent:memory:read"],
    "expiresAt": "2026-03-27T10:00:00Z"
  },
  "capabilities": {
    "canExecuteCode": false,
    "canAccessInternet": true,
    "canReadFiles": false,
    "canWriteFiles": true,
    "availableTools": []
  }
}
```

## Chat

### POST /agent/chat

Creates chat session and returns system prompt.

**Headers:** `Authorization: Bearer {access_token}`

**Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Help me write a document" }
  ],
  "appContext": { "currentPage": "Project Plan" },
  "parentSession": "sess_abc123"
}
```

**Response:**
```json
{
  "sessionId": "sess_xyz789",
  "session": {
    "sessionId": "sess_xyz789",
    "startedAt": "2026-02-27T10:00:00Z",
    "parentSessionId": "sess_abc123"
  },
  "systemPrompt": "## Agent Personality\n\nYou are helpful...",
  "message": "Chat session created. Integrate with LLM provider for responses."
}
```

## Memory

### GET /agent/memory

Retrieves agent memory entries.

**Headers:** `Authorization: Bearer {access_token}`

**Query:** `?type=PREFERENCE&limit=20`

**Response:**
```json
{
  "memories": [
    {
      "id": "mem_abc123",
      "type": "PREFERENCE",
      "summary": "User prefers bullet points",
      "details": { "communication_style": "bullet_points" },
      "appId": "notion-assistant",
      "createdAt": "2026-02-27T10:00:00Z"
    }
  ]
}
```

### POST /agent/memory

Writes new memory entry.

**Headers:** `Authorization: Bearer {access_token}`

**Body:**
```json
{
  "type": "PREFERENCE",
  "summary": "User prefers concise responses",
  "details": { "max_words": 50 },
  "appId": "notion-assistant"
}
```

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": "mem_xyz789",
    "type": "PREFERENCE",
    "summary": "User prefers concise responses",
    "createdAt": "2026-02-27T10:00:00Z"
  }
}
```

## Sessions

### GET /agent/sessions

Lists past chat sessions.

**Headers:** `Authorization: Bearer {access_token}`

**Query:** `?limit=20`

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "sess_abc123",
      "appId": "notion-assistant",
      "appName": "Notion Assistant",
      "messageCount": 5,
      "startedAt": "2026-02-27T09:00:00Z",
      "lastActiveAt": "2026-02-27T09:30:00Z",
      "endedAt": null
    }
  ]
}
```

## Billing

### GET /billing/summary

Gets billing summary and usage.

**Query:** `?wallet=0x1234`

**Response:**
```json
{
  "wallet": "0x1234...",
  "tier": "gold",
  "plan": "Gold",
  "limits": {
    "free": 1000,
    "verified": 50000,
    "unlimited": true
  },
  "usage": {
    "thisMonth": {
      "interactions": 150,
      "cost": 0,
      "limit": 50000,
      "percentUsed": 0
    },
    "allTime": {
      "interactions": 450,
      "cost": 0
    }
  },
  "apps": 2,
  "pricing": {
    "per1kInteractions": 0.10,
    "currency": "USD"
  }
}
```

### GET /billing/usage

Gets detailed usage by app and day.

**Query:** `?wallet=0x1234&app_id=my-app&start_date=2026-01-01&end_date=2026-02-27`

**Response:**
```json
{
  "wallet": "0x1234...",
  "tier": "gold",
  "summary": {
    "totalInteractions": 450,
    "totalTokens": 125000,
    "totalCost": 0,
    "freeLimit": 50000,
    "billableInteractions": 0,
    "estimatedCost": 0,
    "currency": "USD"
  },
  "byApp": [
    { "appId": "notion-assistant", "interactions": 300, "tokens": 80000, "cost": 0 }
  ],
  "byDay": [
    { "date": "2026-02-27", "interactions": 25, "tokens": 7000, "cost": 0 }
  ]
}
```

## Enterprise

### GET /enterprise/activity

Gets activity log.

**Query:** `?wallet=0x1234&limit=50`

**Response:**
```json
{
  "wallet": "0x1234...",
  "activities": [
    {
      "type": "session",
      "appId": "notion-assistant",
      "appName": "Notion Assistant",
      "sessionId": "sess_abc123",
      "startedAt": "2026-02-27T10:00:00Z",
      "endedAt": null
    }
  ],
  "total": 1
}
```

### GET /enterprise/audit-log

Gets audit log for compliance.

**Query:** `?wallet=0x1234&start_date=2026-01-01&end_date=2026-02-27`

**Response:**
```json
{
  "wallet": "0x1234...",
  "auditLog": [
    {
      "timestamp": "2026-02-27T10:00:00Z",
      "action": "SESSION",
      "appId": "notion-assistant",
      "appName": "Notion Assistant",
      "details": {
        "sessionId": "sess_abc123",
        "ipAddress": "192.168.1.1",
        "messageCount": 5
      }
    }
  ],
  "total": 1
}
```

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{ "error": "Invalid parameters" }
```

### 401 Unauthorized
```json
{ "error": "Invalid or expired access token" }
```

### 403 Forbidden
```json
{ "error": "Insufficient permissions" }
```

### 404 Not Found
```json
{ "error": "Resource not found" }
```

### 429 Rate Limited
```json
{ "error": "Rate limit exceeded. Try again later." }
```

### 500 Server Error
```json
{ "error": "Internal server error" }
```
