# LLM Provider Integration

This module provides secure API key management and integration with multiple LLM providers for dynamic question generation in the conversational interview system.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic, Local (Ollama), Custom APIs
- **Secure API Key Storage**: Encrypted with wallet signature, stored in localStorage only
- **Cost Tracking**: Real-time budget monitoring with configurable limits
- **Dynamic Question Generation**: AI-powered contextual follow-up questions
- **Zero-Server Storage**: API keys never leave the user's browser

## Supported Providers

| Provider | Models | Cost (per 1K tokens) | API Key Required |
|----------|--------|---------------------|------------------|
| **OpenAI** | GPT-4, GPT-4-turbo, GPT-3.5-turbo | $0.0015-$0.03 | ✅ Yes |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | $0.003-$0.015 | ✅ Yes |
| **Local (Ollama)** | Llama2, Mistral, CodeLlama | Free | ❌ No |
| **Custom** | Any OpenAI-compatible | Varies | ✅ Yes |

## Architecture

### Security Model
```
User enters API Key
        ↓
Wallet signs static message
        ↓
Signature hash → AES-256-GCM key
        ↓
API Key encrypted
        ↓
Stored in localStorage only
```

**Security Properties:**
- ✅ Encryption key derived from user's wallet signature
- ✅ Without wallet access, API key is unreadable
- ✅ Keys never transmitted to servers
- ✅ User can delete keys at any time

### Cost Control Flow
```
Interview starts
        ↓
User sets max budget ($0.10 - $5.00)
        ↓
Each API call tracked
        ↓
Warning at 80% threshold
        ↓
Auto-stop at 100%
```

## Components

### 1. ProviderSelector
Dropdown to select LLM provider with cost information.

```tsx
import { ProviderSelector } from './components/llm';

<ProviderSelector 
  onProviderChange={(provider) => console.log(provider)}
/>
```

### 2. ApiKeyInput
Secure input for entering and saving API keys.

```tsx
import { ApiKeyInput } from './components/llm';

<ApiKeyInput 
  provider="openai"
  onSaved={() => console.log('API key saved')}
/>
```

### 3. CostSettingsPanel
Configure budget limits and warning thresholds.

```tsx
import { CostSettingsPanel } from './components/llm';

<CostSettingsPanel compact />
```

### 4. CostDisplay
Real-time cost tracking display.

```tsx
import { CostDisplay } from './components/llm';

<CostDisplay compact />
```

### 5. LLMSettingsPanel
Complete settings panel combining all components.

```tsx
import { LLMSettingsPanel } from './components/llm';

<LLMSettingsPanel onComplete={() => setShowSettings(false)} />
```

### 6. DynamicConversationContainer
Enhanced conversation UI with LLM integration.

```tsx
import { DynamicConversationContainer } from './components/conversation';

<DynamicConversationContainer onClose={() => console.log('Closed')} />
```

## Usage

### Basic Setup

```tsx
import { useLLMSettings } from './hooks/useLLMSettings';
import { LLMSettingsPanel } from './components/llm';

function App() {
  const { selectedProvider, hasApiKey } = useLLMSettings();
  
  return (
    <div>
      {!selectedProvider || !hasApiKey(selectedProvider) ? (
        <LLMSettingsPanel />
      ) : (
        <DynamicConversationContainer />
      )}
    </div>
  );
}
```

### Using LLM Client Directly

```typescript
import { LLMClient } from './services/llmClient';
import { getDecryptedApiKey } from './services/apiKeyManager';
import { BrowserProvider } from 'ethers';

// Get signer
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Get decrypted API key
const apiKey = await getDecryptedApiKey('openai', signer);

// Create client
const client = new LLMClient('openai', apiKey);

// Make request
const response = await client.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Generate a question about React' }
  ],
  maxTokens: 150
});

console.log(response.content);
console.log(`Cost: $${response.cost.toFixed(4)}`);
```

### Cost Tracking

```typescript
import { useCostTracker } from './hooks/useCostTracker';

function MyComponent() {
  const { startTracking, trackCost, getRemainingBudget } = useCostTracker();
  
  // Start tracking with custom budget
  startTracking({ maxCostPerInterview: 1.00 });
  
  // Track API call cost
  const canContinue = trackCost(0.023); // $0.023 cost
  
  if (!canContinue) {
    console.log('Budget exceeded!');
  }
  
  console.log(`Remaining: $${getRemainingBudget()}`);
}
```

## Configuration

### Cost Settings
```typescript
interface CostSettings {
  maxCostPerInterview: number;  // Default: $0.50
  warningThreshold: number;     // Default: 0.8 (80%)
  currency: string;             // Default: 'USD'
}
```

### Provider Configuration
```typescript
interface ProviderConfig {
  name: string;
  id: LLMProvider;
  models: string[];
  defaultModel: string;
  costPer1KTokens: {
    input: number;
    output: number;
  };
  baseUrl?: string;
  description: string;
  docsUrl: string;
}
```

## API Key Storage

API keys are stored in localStorage under the key `encrypted_api_keys`:

```json
{
  "openai": {
    "provider": "openai",
    "encryptedData": "base64_encrypted_string",
    "iv": "base64_iv",
    "createdAt": 1708195200000
  }
}
```

### Encryption Process

1. User signs static message: "TAIS Configuration Encryption Key"
2. Signature is hashed with SHA-256
3. Hash used as AES-256-GCM key material
4. API key encrypted with random IV
5. IV + encrypted data stored as base64

### Decryption Process

1. User signs same static message
2. Same key derivation process
3. IV extracted from stored data
4. AES-GCM decryption
5. Original API key recovered

## Dynamic Question Generation

When LLM provider is configured, the system can generate contextual follow-up questions:

```typescript
import { generateDynamicQuestion } from './services/llmClient';

const previousResponses = [
  "I'm a senior React developer with 5 years of experience",
  "I specialize in frontend architecture and state management"
];

const nextQuestion = await generateDynamicQuestion(
  client,
  previousResponses,
  2 // Question index
);

// Example output:
// "Can you tell me about a challenging state management problem you've solved recently?"
```

## Files Structure

```
src/
├── types/
│   └── llm.ts                      # LLM types and provider configs
├── services/
│   ├── apiKeyManager.ts            # Encryption/decryption service
│   └── llmClient.ts                # LLM API clients
├── hooks/
│   ├── useLLMSettings.ts           # Provider settings state
│   └── useCostTracker.ts           # Cost tracking state
└── app/components/
    └── llm/
        ├── LLMSettings.tsx         # Settings panel components
        ├── CostDisplay.tsx         # Cost display component
        └── index.ts                # Component exports
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "No wallet detected" | MetaMask not installed | Install MetaMask extension |
| "Failed to decrypt API key" | Wrong wallet / not connected | Connect correct wallet |
| "API key saved securely" | Wrong API key format | Check key in provider dashboard |
| "Budget exceeded" | Cost limit reached | Increase budget or use local model |
| "Local LLM error" | Ollama not running | Start Ollama: `ollama serve` |

## Local Development

### Testing with Ollama (Free)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama2`
3. Start server: `ollama serve`
4. Select "Local (Ollama)" in provider dropdown
5. No API key needed!

### Testing with OpenAI

1. Get API key: https://platform.openai.com/api-keys
2. Connect wallet in app
3. Enter API key in settings
4. Save (encrypted with wallet signature)

## Future Enhancements

- [ ] Support for more providers (Cohere, AI21, etc.)
- [ ] Token usage analytics
- [ ] Smart cost estimation before API calls
- [ ] Response caching for common questions
- [ ] Team/shared API key management
- [ ] Usage quotas per team member

## Security Considerations

1. **API Key Exposure**: Never log or display decrypted API keys
2. **Wallet Permissions**: Only request signing for encryption, not transactions
3. **Storage Limits**: localStorage has ~5-10MB limit
4. **Clear on Logout**: Optionally clear keys when user disconnects wallet
5. **Backup Warning**: Remind users that clearing localStorage removes keys

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- Web Crypto API (for encryption)
- localStorage
- MetaMask or compatible wallet

## Dependencies

- `ethers` - Ethereum interactions
- `zustand` - State management
- `@tensorflow/tfjs` - ML embeddings (optional)

## License

MIT
