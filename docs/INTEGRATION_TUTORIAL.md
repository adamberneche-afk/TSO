# TAIS Integration Tutorial: Building a Notion AI Assistant

This tutorial walks you through building a Notion integration that uses a TAIS agent to generate documents intelligently.

## Prerequisites

1. Node.js 18+
2. A TAIS account with Genesis NFT (for developer access)
3. A Notion account with API access

## Step 1: Register Your App

1. Go to https://taisplatform.vercel.app/developer
2. Connect your wallet
3. Click "Register New App"
4. Fill in the details:
   - App ID: `notion-ai-assistant`
   - Name: Notion AI Assistant
   - Redirect URI: `http://localhost:3000/callback`
5. Save your `appId` and `appSecret`

## Step 2: Set Up the Project

```bash
mkdir notion-ai-assistant
cd notion-ai-assistant
npm init -y
npm install tais-notion-integration tais-agent-sdk @notionhq/client dotenv
```

## Step 3: Configure Environment

Create `.env`:
```env
TAIS_APP_ID=notion-ai-assistant
TAIS_APP_SECRET=your-app-secret
NOTION_TOKEN=your-notion-integration-token
NOTION_PAGE_ID=your-parent-page-id
```

## Step 4: Build the Integration

Create `index.js`:

```javascript
const { NotionIntegration } = require('tais-notion-integration');
const { TAISAgent } = require('tais-agent-sdk');
require('dotenv').config();

// Initialize TAIS Agent
const agent = new TAISAgent({
  appId: process.env.TAIS_APP_ID,
  appSecret: process.env.TAIS_APP_SECRET,
  appName: 'Notion AI Assistant',
  redirectUri: 'http://localhost:3000/callback',
});

// Initialize Notion Integration
const notion = new NotionIntegration({
  agent,
  notionToken: process.env.NOTION_TOKEN,
});

// OAuth flow helper
async function authenticateUser(walletAddress) {
  const authUrl = agent.getAuthorizationUrl({
    scopes: ['agent:identity:read', 'agent:memory:read_write'],
    state: walletAddress,
  });
  
  console.log('Please authenticate:', authUrl);
  // In production, redirect user to authUrl
}

// Generate document from topic
async function generateDocument(topic, userContext) {
  // Get user context
  const context = await agent.getContext();
  
  // Generate structured document
  const result = await notion.generateStructure({
    topic,
    sections: ['Overview', 'Key Points', 'Action Items', 'Next Steps'],
  });
  
  console.log('Created:', result.url);
  return result;
}

// Track user preferences
async function trackPreference(wallet, preference) {
  await agent.updateMemory({
    context: await agent.getContext(),
    update: {
      type: 'PREFERENCE',
      summary: preference.summary,
      details: preference.details,
    },
  });
}

// Example usage
async function main() {
  // First-time setup: authenticate
  const userWallet = '0x1234...'; // User's wallet
  await authenticateUser(userWallet);
  
  // After user authenticates...
  const doc = await generateDocument('Q1 Product Roadmap');
  console.log('Document created:', doc.url);
}

main().catch(console.error);
```

## Step 5: Run the Integration

```bash
node index.js
```

## Key Concepts

### Agent Context

The agent context contains:
- **SOUL.md** - Agent personality and behavior
- **PROFILE.md** - User preferences
- **MEMORY.md** - Learned context from past interactions

```javascript
const context = await agent.getContext();
console.log(context.config.soul);    // Agent personality
console.log(context.config.profile); // User profile
console.log(context.config.memory);  // Accumulated memory
```

### Session Handoff

Continue conversations across apps:

```javascript
// In Notion
const response1 = await agent.chat({
  context,
  messages: [{ role: 'user', content: 'Create a project plan' }],
});
const sessionId = response1.sessionId;

// Later in Slack - agent remembers the context
const response2 = await agent.chat({
  context,
  messages: [{ role: 'user', content: 'Now create tasks for it' }],
  parentSession: sessionId,
});
```

### Memory Types

| Type | Description | Example |
|------|-------------|---------|
| `PREFERENCE` | User preferences | "User prefers bullet points" |
| `ACTION` | Completed actions | "Created Notion page X" |
| `FACT` | Learned facts | "User works on Project Y" |
| `CONVERSATION` | Chat history | "Discussed topic Z" |

## Advanced: Custom Prompt Engineering

Enhance agent responses with custom prompts:

```javascript
const enhancedContext = await agent.getContext();

const customPrompt = `
You are an expert technical writer.
- Use clear, concise language
- Include code examples where relevant
- Structure with headings and bullet points
- ${enhancedContext.config.soul}
`;

const response = await agent.chat({
  context: { ...enhancedContext, config: { ...enhancedContext.config, soul: customPrompt } },
  messages: [{ role: 'user', content: 'Explain OAuth authentication' }],
});
```

## Troubleshooting

### Error: "Invalid app credentials"

- Check your `appId` and `appSecret` are correct
- Verify redirect URI matches exactly
- Ensure app is active in developer portal

### Error: "Insufficient permissions"

- User hasn't granted required scopes
- Re-authenticate with requested scopes

### Error: "Token expired"

- Call `refreshToken()` to get new access token
- Implement token refresh in your error handler

## Next Steps

1. Add more sophisticated AI prompts
2. Implement real-time Slack notifications
3. Create a web UI for the integration
4. Add error monitoring with Sentry

## See Also

- [SDK Documentation](../agent-sdk/README.md)
- [API Reference](./API.md)
- [Security Best Practices](../agent-sdk/README.md#security-best-practices)
