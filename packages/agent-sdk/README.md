# @tais/agent-sdk

TAIS Agent SDK - Cross-App Agent Portability for third-party integrations.

This SDK enables developers to integrate TAIS agents into their applications (Notion, Slack, Linear, etc.) with persistent identity and memory across app boundaries.

## Installation

```bash
npm install @tais/agent-sdk
# or
yarn add @tais/agent-sdk
```

## Quick Start

```typescript
import { TAISAgent, VALID_SCOPES } from '@tais/agent-sdk';

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

### Authentication

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
// Returns:
// {
//   agentId: '...',
//   walletAddress: '0x...',
//   tier: 'gold',
//   config: {
//     soul: '...',      // personality
//     profile: '...',  // user preferences
//     memory: '...'    // accumulated context
//   },
//   permissions: { scopes: [...], ... },
//   capabilities: { canExecuteCode: false, ... }
// }
```

### Chat

#### `chat(options)`

Send a message and get a response. Supports session handoff.

```typescript
const response = await tais.chat({
  context,
  messages: [
    { role: 'user', content: 'Create a roadmap' },
  ],
  appContext: {
    currentDocument: 'Q2 Planning',
  },
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

| Scope | Description |
|-------|-------------|
| `agent:identity:read` | Read SOUL.md and PROFILE.md |
| `agent:identity:soul:read` | Read SOUL.md only |
| `agent:identity:profile:read` | Read PROFILE.md only |
| `agent:memory:read` | Read MEMORY.md |
| `agent:memory:write` | Write to MEMORY.md |
| `agent:config:read` | Read agent.json constraints |

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

## Example Integrations

See the `packages/` directory for example integrations:
- `notion-integration/` - Document creation
- `slack-integration/` - Smart replies
- `linear-integration/` - Task creation

## License

MIT
