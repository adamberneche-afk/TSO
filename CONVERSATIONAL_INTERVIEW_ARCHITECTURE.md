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

## 📝 Open Questions

1. **Demo Mode?** Should we offer 1-2 free LLM-powered interviews using our API key?

2. **Static Extraction:** Rule-based keywords vs lightweight TensorFlow.js model?

3. **Question 1 Integration:** Feed into existing Description field or replace it?

4. **API Key Security:** localStorage vs browser extension recommendation?

5. **Cost Display:** Real-time tracking or upfront estimate only?

---

**Status:** Architecture Approved  
**Next:** Answer open questions, then begin Phase 1
