# tais-agent-sdk

TAIS Agent SDK - Cross-App Agent Portability for third-party integrations.

This SDK enables developers to integrate TAIS agents into their applications (Notion, Slack, Linear, etc.) with persistent identity and memory across app boundaries.

## Installation

```bash
npm install tais-agent-sdk
# or
yarn add tais-agent-sdk
```

## Quick Start

```typescript
import { TAISAgent, VALID_SCOPES } from 'tais-agent-sdk';

// Initialize the SDK
const tais = new TAISAgent({
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  appName: 'My App',
  redirectUri: 'https://myapp.com/tais/callback',
});

// Step 1: Get authorization URL and have user authenticate
const authUrl = tais.getAuthorizationUrl({
  scopes: ['agent:identity:read', 'agent:memory:read'],
  state: 'wallet_address:optional_state',
});

// Redirect user to authUrl, then handle callback with authorization code

// Step 2: Exchange code for tokens
const tokens = await tais.exchangeCode('authorization_code_from_callback');

// Step 3: Get agent context
const context = await tais.getContext();

// Step 4: Chat with the agent
const response = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Hello!' }],
  appContext: { currentPage: 'My Document' },
});

// Step 5: Update memory with new learnings
await tais.updateMemory({
  context,
  update: {
    type: 'preference',
    summary: 'User prefers bullet points over paragraphs',
    details: { communication_style: 'bullet_points' },
  },
});
```

## Prerequisites

1. **Register your app** at https://taisplatform.vercel.app/developer
2. **Obtain credentials** - Get your `appId` and `appSecret`
3. **Configure redirect URI** - Add your OAuth callback URL

## Authentication Flow

The SDK uses OAuth 2.0 with wallet-based authentication:

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  User   │────▶│   Your App  │────▶│  TAIS API   │
│         │◀────│              │◀────│             │
└─────────┘     └──────────────┘     └─────────────┘
   Wallet          Redirect           Exchange Code
   Signature       to Auth URL       for Token
```

### Step-by-Step:

1. **Generate Authorization URL**
   ```typescript
   const authUrl = tais.getAuthorizationUrl({
     scopes: ['agent:identity:read', 'agent:memory:read'],
     state: userId,
   });
   ```

2. **User authenticates** - Redirect to authUrl, user signs with wallet

3. **Exchange Code for Token**
   ```typescript
   const tokens = await tais.exchangeCode(codeFromCallback);
   ```

4. **Store tokens securely** - Use encrypted storage

## API Reference

### Constructor

```typescript
new TAISAgent(config: TAISAgentConfig)
```

Config:
- `appId` - Your app's ID (from TAIS developer portal)
- `appSecret` - Your app's secret (keep safe!)
- `appName` - Display name for your app
- `redirectUri` - OAuth callback URL
- `baseUrl` - Optional, defaults to `https://tso.onrender.com`

### Authentication Methods

#### `getAuthorizationUrl(options)`

Get the OAuth authorization URL to redirect users to.

```typescript
const url = await tais.getAuthorizationUrl({
  scopes: ['agent:identity:read', 'agent:memory:read_write'],
  state: 'optional_csrf_token',
});
```

#### `exchangeCode(code)`

Exchange authorization code for access tokens.

```typescript
const tokens = await tais.exchangeCode('authorization_code');
tais.setTokens(tokens); // Store for subsequent calls
```

#### `refreshToken()`

Refresh expired access token.

```typescript
const newTokens = await tais.refreshToken();
```

### Agent Context

#### `getContext(walletAddress?)`

Retrieve the user's agent context based on granted permissions.

```typescript
const context = await tais.getContext();
// Returns: { agentId, walletAddress, tier, config, permissions, capabilities }
```

### Chat

#### `chat(options)`

Send a message and get a response. Supports session handoff.

```typescript
const response = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Create a roadmap' }],
  appContext: { currentDocument: 'Q2 Planning' },
  parentSession: 'optional_session_id', // For continuing from another app
});
```

### Memory

#### `getMemory(type?, limit?)`

Retrieve agent memory entries.

```typescript
const { memories } = await tais.getMemory('PREFERENCE', 20);
```

#### `updateMemory(options)`

Write a new entry to agent memory.

```typescript
await tais.updateMemory({
  context,
  update: {
    type: 'preference',
    summary: 'User prefers concise responses',
    details: { max_words: 50 },
  },
});
```

### Sessions

#### `getSessions(limit?)`

List past agent sessions.

```typescript
const { sessions } = await tais.getSessions(10);
```

## Available Scopes

| Scope | Description | Sensitivity |
|-------|-------------|-------------|
| `agent:identity:read` | Read SOUL.md and PROFILE.md | Medium |
| `agent:identity:soul:read` | Read SOUL.md only | Medium |
| `agent:identity:profile:read` | Read PROFILE.md only | Low |
| `agent:memory:read` | Read MEMORY.md | Medium |
| `agent:memory:write` | Write to MEMORY.md | High |
| `agent:config:read` | Read agent.json constraints | Low |

## Session Handoff

When a user switches between apps, continue the conversation:

```typescript
// In App A (Notion)
const response1 = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Plan Q2 roadmap' }],
});

// Store sessionId
const sessionId = response1.sessionId;

// Later in App B (Slack)
const response2 = await tais.chat({
  context,
  messages: [{ role: 'user', content: 'Create tasks for this' }],
  parentSession: sessionId, // Continues from Notion
});
```

## Security Best Practices

### 1. Token Storage

Never store tokens in plain text. Use encrypted storage:

```typescript
// Good: Encrypted storage
const encrypted = encrypt(tokens, userKey);
localStorage.setItem('tais_tokens', encrypted);

// Bad: Plain text storage (DO NOT)
localStorage.setItem('tais_tokens', JSON.stringify(tokens));
```

### 2. App Secret

- Store `appSecret` in environment variables, not in code
- Never commit secrets to version control
- Rotate secrets periodically

```typescript
// Good
const tais = new TAISAgent({
  appSecret: process.env.TAIS_APP_SECRET,
});

// Bad
const tais = new TAISAgent({
  appSecret: 'my-secret-in-code', // Never do this!
});
```

### 3. HTTPS Only

Always use HTTPS in production:

```typescript
const tais = new TAISAgent({
  baseUrl: 'https://tso.onrender.com', // HTTPS required
});
```

### 4. Scope Minimization

Request only the scopes you need:

```typescript
// Good: Minimal scopes
scopes: ['agent:identity:read']

// Excessive: More access than needed
scopes: ['agent:identity:read', 'agent:memory:read', 'agent:memory:write']
```

### 5. Token Expiry

Handle token expiry gracefully:

```typescript
try {
  const response = await tais.chat({ context, messages });
} catch (error) {
  if (error.message.includes('expired')) {
    const newTokens = await tais.refreshToken();
    // Retry with new token
  }
}
```

## Error Handling

```typescript
import { TAISError, TAISAuthError, TAISScopeError } from 'tais-agent-sdk';

try {
  await tais.chat({ context, messages });
} catch (error) {
  if (error instanceof TAISAuthError) {
    // Redirect to auth
    window.location.href = authUrl;
  } else if (error instanceof TAISScopeError) {
    // Request additional scope
    console.log('Missing scope:', error.requiredScope);
  } else {
    // Handle other errors
    console.error('SDK Error:', error.message);
  }
}
```

## Rate Limiting

The API implements rate limiting. Handle 429 responses:

```typescript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
}
```

## Example Integrations

See the `packages/` directory for complete examples:
- `notion-integration/` - Document creation
- `slack-integration/` - Smart replies
- `linear-integration/` - Task creation

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import {
  TAISAgent,
  TAISAgentConfig,
  AgentContext,
  ChatMessage,
  MemoryEntry,
  Session,
} from 'tais-agent-sdk';

const context: AgentContext = await tais.getContext();
const messages: ChatMessage[] = context.config.soul ? [{ role: 'user', content: 'Hi' }] : [];
```

## License

MIT
