# Conversational Interview v2.5 - Architecture Specification
**Status:** Design Approved  
**Date:** February 15, 2026  
**Principle:** User Ownership = User Pays

---

## 🎯 Core Philosophy

**"Bring Your Own Intelligence"**
- Users own their AI alignment
- Users own their inference costs
- We provide the framework, they provide the compute
- Maximum choice, maximum accessibility

---

## 💰 Cost Model: User-Pays Inference

### Option 1: Bring Your Own API Key (Recommended)
```typescript
interface UserLLMConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey: string; // Stored encrypted in browser only
  model: string;
  baseUrl?: string; // For local/custom models
}
```

**Supported Providers:**
- **OpenAI**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Local**: Ollama, LM Studio, text-generation-webui
- **Custom**: Any OpenAI-compatible API

**Security:**
- API keys stored in browser localStorage only (encrypted)
- Never sent to our servers
- Keys wiped when conversation complete

### Option 2: Pay-As-You-Go (Future)
- User deposits $APP credits
- We handle inference costs
- Small markup for convenience

### Option 3: Free Tier (Static Questions)
- 3 fixed questions (no LLM inference)
- Basic configuration generation
- No dynamic follow-ups

---

## 🗄️ Data Storage: Ephemeral Only

**Conversation Lifecycle:**
```
User starts interview
    ↓
Questions/answers stored in browser localStorage
    ↓
User completes interview
    ↓
Generate AgentConfig from conversation
    ↓
WIPE conversation from localStorage
    ↓
Only AgentConfig persisted to database
```

**Privacy-First:**
- No server-side conversation storage
- No analytics on conversation content
- No logging of user inputs
- 24-hour auto-expiry for drafts

---

## 🎨 UX Flow: Conversation-First

### Primary Experience
```
┌─────────────────────────────────────┐
│  Welcome to TAIS Configuration     │
│                                     │
│  Let's create your AI assistant    │
│  through conversation.             │
│                                     │
│  [Start Conversation]              │
│                                     │
│  Or if you prefer:                 │
│  [Use Form Mode (Classic)] ← Opt-out│
└─────────────────────────────────────┘
```

### The Three Questions

**Question 1 (Required, Not Skippable):**
> "Describe your ideal day working with this AI assistant. What would you want it to help you with from morning to night?"

**Purpose:** Replaces current "Describe your ideal agent" text area. Provides temporal context for better answers.

**Question 2 (Required, Skippable):**
> "When this assistant gives you suggestions, do you prefer it to just tell you what to do, explain the reasoning, or give you multiple options?"

**Static Options:**
- Just tell me what to do (direct)
- Explain the reasoning (balanced)  
- Give me multiple options (conversational)

**Dynamic:** Adapts follow-up based on Q1 domain

**Question 3 (Optional, Skippable):**
> "Is there anything specific you want this assistant to NEVER do? Any boundaries or constraints?"

**Purpose:** Safety constraints, blocked actions

---

## 🔧 Implementation Modes

### Mode 1: Static (Free, Always Available)
```typescript
const STATIC_QUESTIONS = [
  {
    id: 'ideal_day',
    question: "Describe your ideal day...",
    extraction: 'rule_based', // Keyword matching
    required: true,
    skippable: false
  },
  {
    id: 'communication_style',
    question: "When this assistant gives you suggestions...",
    type: 'choice',
    options: ['direct', 'balanced', 'conversational'],
    required: true,
    skippable: true
  },
  {
    id: 'boundaries',
    question: "Is there anything specific you want this assistant to NEVER do?",
    required: false,
    skippable: true
  }
];
```

**Extraction:** Rule-based keyword matching (zero API calls)

### Mode 2: Dynamic (User-Provided LLM)
- Same 3 questions but contextually adapted
- Q2 generated based on Q1 domain extraction
- Q3 generated based on Q1+Q2 patterns
- Real-time entity extraction with LLM

---

## 🚀 Implementation Plan

### Phase 1: Static MVP (Week 1)
- [ ] Build conversation UI components
- [ ] Implement 3 fixed questions
- [ ] Create static entity extraction
- [ ] Add localStorage persistence
- [ ] Build live preview panel

### Phase 2: Dynamic Mode (Week 2)
- [ ] Add LLM provider selection UI
- [ ] Implement API key input (secure storage)
- [ ] Build dynamic question generation
- [ ] Add provider-specific clients

### Phase 3: Integration (Week 3)
- [ ] Connect to existing config generation
- [ ] Add "Switch to Form" functionality
- [ ] User testing
- [ ] Bug fixes

---

## ✅ Final Decisions

### 1. **Demo Mode: NO**
- Lower operational cost
- Target market (early adopters) doesn't need to be sold
- They understand BYO API key model

### 2. **Static Extraction: TensorFlow.js**
- Higher quality output (85% vs 70% accuracy)
- Config must appropriately align with user intent
- Worth the complexity for better results

### 3. **Question 1 Integration: FEED INTO**
- Q1 analyzed separately from Description field
- Description remains as separate, editable field
- Q1 feeds goals, skills suggestions, personality hints

### 4. **API Key Security: Encrypted localStorage**
- Encryption at rest in browser
- Master key derived from wallet signature (user-owned)
- Never transmitted to our servers
- Better than plain localStorage, easier than extension

### 5. **Cost Display: User Sets Maximum**
- User configures max spend per interview (e.g., $0.10)
- Interview auto-completes if cost approaches limit
- Shows "$0.03 / $0.10 spent" progress
- No surprises, user in complete control

---

## 🔐 API Key Encryption Details

### Encryption Strategy
```typescript
// Derive encryption key from wallet signature
async function deriveEncryptionKey(walletAddress: string): Promise<CryptoKey> {
  // User signs a static message
  const message = "TAIS Configuration Encryption Key";
  const signature = await signer.signMessage(message);
  
  // Use signature hash as encryption key material
  const keyMaterial = await crypto.subtle.digest('SHA-256', 
    new TextEncoder().encode(signature)
  );
  
  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt API key
async function encryptApiKey(apiKey: string, walletAddress: string): Promise<string> {
  const key = await deriveEncryptionKey(walletAddress);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey)
  );
  
  // Store: iv + encrypted (base64)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt API key (only possible with user's wallet signature)
async function decryptApiKey(encryptedData: string, walletAddress: string): Promise<string> {
  const key = await deriveEncryptionKey(walletAddress);
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}
```

**Security Properties:**
- ✅ Encryption key derived from user's wallet signature
- ✅ Without wallet access, API key is unreadable
- ✅ Keys never leave the browser
- ✅ If user clears localStorage, they just re-enter API key

---

## 💰 Cost Control Implementation

```typescript
interface UserCostSettings {
  maxCostPerInterview: number; // e.g., 0.10 for $0.10
  warningThreshold: number;    // e.g., 0.80 for 80% of max
}

class CostTracker {
  private totalCost: number = 0;
  private maxCost: number;
  
  constructor(settings: UserCostSettings) {
    this.maxCost = settings.maxCostPerInterview;
  }
  
  async trackApiCall(cost: number): Promise<boolean> {
    this.totalCost += cost;
    
    // Check if approaching limit
    if (this.totalCost >= this.maxCost * 0.8) {
      toast.warning(`Cost warning: $${this.totalCost.toFixed(3)} / $${this.maxCost.toFixed(2)}`);
    }
    
    // Check if exceeded
    if (this.totalCost >= this.maxCost) {
      toast.error(`Cost limit reached: $${this.maxCost.toFixed(2)}`);
      return false; // Stop the interview
    }
    
    return true; // Continue
  }
  
  getCurrentSpend(): number {
    return this.totalCost;
  }
  
  getRemainingBudget(): number {
    return this.maxCost - this.totalCost;
  }
}
```

**UI Display:**
```
💰 Cost: $0.023 / $0.100  [████████░░] 23%
```

---

## 🤖 TensorFlow.js Entity Extraction

### Model Choice: Universal Sentence Encoder (USE)
- **Size:** ~25MB (acceptable for web)
- **Accuracy:** 85%+ on domain classification
- **Speed:** ~100ms inference on modern devices
- **Offline:** Works without internet after initial load

### Implementation
```typescript
import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/universal-sentence-encoder';

class EntityExtractor {
  private model: any;
  
  async loadModel() {
    this.model = await load();
  }
  
  async extractFromText(text: string): Promise<ExtractedEntities> {
    // Embed the text
    const embeddings = await this.model.embed([text]);
    
    // Domain classification (coding, writing, research, etc.)
    const domain = await this.classifyDomain(embeddings);
    
    // Intent extraction
    const intents = await this.extractIntents(text);
    
    // Tone analysis
    const tone = await this.analyzeTone(text);
    
    return {
      domain,
      intents,
      tone,
      confidence: 0.85
    };
  }
  
  private async classifyDomain(embeddings: tf.Tensor): Promise<string> {
    // Compare against domain embeddings
    // Return closest match
  }
}
```

**Training Data:**
- Curated examples of "ideal day" descriptions
- Labeled with correct domain, goals, personality
- ~1000 examples for initial training

---

**Status:** Architecture Finalized  
**Ready for:** Phase 1 Implementation
**Estimated Timeline:** 4 weeks (1 week per phase)
