# Conversational Interview - v2.5 Planning Document
**Target Release:** v2.5 (Post-v2.0 Launch)  
**Status:** Planning Phase  
**Priority:** Medium

---

## 🎯 Vision

Transform the current form-based interview into a natural, conversational experience that:
1. **Understands context** - Asks follow-up questions based on user responses
2. **Educates naturally** - Explains features through conversation, not documentation
3. **Builds iteratively** - Starts with core needs, then refines through dialogue
4. **Provides feedback** - Natural language summary at each stage

---

## 📋 Current State vs Target

### Current Interview Flow (v2.0)
```
Linear Form Flow:
1. Identity Step (wallet + name)
2. Goals Step (select from list)
3. Skills Step (browse registry)
4. Personality Step (sliders)
5. Review Step (JSON preview)
```

**Issues:**
- Static, one-way interaction
- No clarification of vague answers
- Users see all options at once (choice overload)
- No iterative refinement
- Technical JSON shown to users

### Target Conversational Flow (v2.5)
```
Dialogue-Based Flow:
1. Welcome & Context Gathering
   └─ "Tell me about yourself and what you do"
   
2. Deep-Dive Discovery
   └─ Follow-up questions based on initial context
   └─ "You mentioned DeFi - are you working on smart contracts or frontend?"
   
3. Smart Recommendations
   └─ Suggest relevant skills based on context
   └─ "Based on your work, I'd recommend these skills..."
   
4. Preference Tuning
   └─ Conversational adjustment of personality/settings
   └─ "Do you prefer quick answers or detailed explanations?"
   
5. Live Preview
   └─ Real-time natural language summary updates
   └─ "Here's what I understand so far..."
```

---

## 🏗️ Technical Architecture

### Core Components

```typescript
// Conversational Interview State
interface ConversationState {
  messages: Message[];
  currentContext: InterviewContext;
  extractedEntities: ExtractedEntities;
  confidenceScore: number;
  pendingClarifications: ClarificationQuestion[];
}

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: DetectedIntent;
  entities?: ExtractedEntity[];
}

interface InterviewContext {
  domain?: string;        // e.g., 'defi', 'web-development'
  role?: string;          // e.g., 'smart-contract-dev'
  experienceLevel?: string;
  preferences: Partial<InterviewAnswers>;
  confirmedFields: string[];
}
```

### Conversation Engine

```typescript
class ConversationalInterviewEngine {
  private llmClient: LLMClient;
  private context: InterviewContext;
  private configBuilder: AgentConfigBuilder;

  async processUserInput(input: string): Promise<AssistantResponse> {
    // 1. Intent Detection
    const intent = await this.detectIntent(input);
    
    // 2. Entity Extraction
    const entities = await this.extractEntities(input);
    
    // 3. Context Update
    this.updateContext(entities);
    
    // 4. Determine Next Action
    const action = this.determineNextAction(intent, entities);
    
    // 5. Generate Response
    const response = await this.generateResponse(action);
    
    return response;
  }

  private async detectIntent(input: string): Promise<Intent> {
    // Use lightweight classification
    // e.g., "clarify_goal", "add_skill", "adjust_personality", "confirm_config"
  }

  private determineNextAction(intent: Intent, entities: Entity[]): Action {
    // Logic tree for conversation flow
    // - If low confidence: Ask clarifying question
    // - If new domain detected: Explore that area
    // - If enough info gathered: Suggest next steps
  }
}
```

---

## 💬 Conversation Flow Design

### Phase 1: Opening & Context (Messages 1-3)

**System:** "Hi! I'm here to help you create your perfect AI assistant. To get started, tell me a bit about yourself and what kind of work you do."

**User:** "I'm a developer working on DeFi projects"

**System:** "Great! DeFi is a fascinating space. Are you primarily working on:
- Smart contracts and Solidity
- Frontend interfaces and dApps  
- Backend infrastructure and indexing
- Something else?"

**User:** "Mostly smart contracts"

**System:** "Perfect! Smart contract development requires careful attention to security. I'll make sure to include security analysis tools in your assistant's toolkit.

What's your experience level with Solidity?"

### Phase 2: Deep Dive (Messages 4-8)

**System:** "Based on your smart contract focus, I'm thinking your assistant should help with:
- Security auditing and vulnerability detection
- Gas optimization suggestions
- Testing and deployment workflows
- Documentation generation

Which of these is most important to you right now?"

**User:** "Security auditing is the biggest priority"

**System:** "Excellent choice. Security first! I'll add Slither and other security tools to your assistant's skills.

What about your workflow - do you prefer to:
- Get suggestions and review them before taking action
- Have the assistant auto-fix issues when it's confident
- Always be asked before any changes are made"

### Phase 3: Skill Discovery (Messages 9-12)

**System:** "I've identified some key skills that would help with smart contract security:

🔍 **slither-analyzer** - Automated vulnerability detection (Trust: 0.95)
🧪 **foundry-toolkit** - Fast testing framework (Trust: 0.92)
📚 **openzeppelin-libs** - Security-audited contracts (Trust: 0.98)

Would you like me to include all of these, or would you prefer to browse the full registry?"

**User:** "Include those three for now"

**System:** "Done! Those are excellent choices.

Now, let me ask about your communication preferences. When the assistant finds a security issue, would you prefer:
- A quick summary: 'Found reentrancy vulnerability in line 45'
- Detailed explanation with code example and fix suggestion
- Something in between?"

### Phase 4: Refinement & Confirmation (Messages 13-15)

**System:** "Here's what I understand about your assistant so far:

**Name:** [Suggested: SolidityGuard or you can name it]
**Focus:** Smart contract security & development
**Key Skills:** Slither, Foundry, OpenZeppelin
**Style:** Detailed explanations with code examples
**Autonomy:** Suggests fixes but waits for approval

Does this sound right? You can say 'yes' to continue, or tell me what you'd like to change."

**User:** "Yes, but make it more concise"

**System:** "Got it! I'll adjust the verbosity to be more concise while keeping the technical detail.

✅ **Updated:** Now provides brief summaries with key details highlighted

Anything else you'd like to adjust?"

### Phase 5: Final Review (Messages 16-18)

**System:** "Perfect! Here's your complete assistant configuration:

---

**SolidityGuard** is your smart contract security assistant. It specializes in finding vulnerabilities, suggesting optimizations, and helping you write secure code.

It has access to industry-leading security tools and will alert you to potential issues before they become problems. It communicates concisely but provides the technical detail you need.

**Ready to save this configuration?** You can always come back and adjust it later."

---

## 🎨 UI/UX Design

### Layout Concept

```
┌─────────────────────────────────────────────────────────────┐
│  TAIS Interview                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 Assistant                                        │   │
│  │                                                     │   │
│  │ Great! Smart contract development requires         │   │
│  │ careful attention to security...                    │   │
│  │                                                     │   │
│  │ [Suggested Skills]                                 │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │ │ Slither  │ │ Foundry  │ │  OpenZep │           │   │
│  │ └──────────┘ └──────────┘ └──────────┘           │   │
│  │                                                     │   │
│  │ Include these? [Yes] [Browse More] [Skip]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 You                                              │   │
│  │                                                     │   │
│  │ Include those three for now                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Live Preview                                     │   │
│  │                                                     │   │
│  │ Current Configuration:                             │   │
│  │ • 3 skills configured                              │   │
│  │ • Security-focused                                 │   │
│  │ • Concise communication                            │   │
│  │                                                     │   │
│  │ [View Full Summary]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Type your response...                        [Send]        │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Features

1. **Chat Interface**
   - Message bubbles with clear sender identification
   - Typing indicators during processing
   - Rich content (skill cards, quick action buttons)

2. **Live Preview Panel**
   - Collapsible sidebar showing current configuration
   - Updates in real-time as conversation progresses
   - Natural language summary (not JSON)

3. **Quick Actions**
   - Inline buttons for common responses
   - "Show me options" for skill discovery
   - "Adjust..." for changing settings

4. **Progress Indicator**
   - Visual progress through conversation phases
   - Option to jump back to previous topics
   - Save and resume later

---

## 🧠 AI/LLM Integration

### Model Selection

**Option 1: GPT-4 (Recommended)**
- **Pros:** Best understanding of context, natural dialogue, reliable entity extraction
- **Cons:** Cost, latency (~1-2s response time)
- **Use Case:** Production conversational interview

**Option 2: Claude 3 Sonnet**
- **Pros:** Good balance of capability and cost, fast responses
- **Cons:** Slightly less nuanced than GPT-4
- **Use Case:** Cost-conscious production

**Option 3: Local Model (Llama 3 70B)**
- **Pros:** No API costs, full privacy
- **Cons:** Requires GPU hosting, less reliable entity extraction
- **Use Case:** Privacy-critical deployments

### Prompt Engineering Strategy

```typescript
const SYSTEM_PROMPT = `You are TAIS, an AI assistant configuration expert. 
Your job is to help users create their perfect AI assistant through natural conversation.

Guidelines:
- Ask ONE question at a time
- Provide clear, actionable choices when appropriate
- Extract key information about user's work domain, goals, and preferences
- Suggest relevant skills based on context
- Keep responses concise (2-3 sentences max)
- Never show JSON or technical configuration details

Current conversation context:
- Extracted domain: {domain}
- Experience level: {experience}
- Skills selected: {skills}
- Preferences: {preferences}

Respond naturally and helpfully.`;
```

### Entity Extraction Pipeline

```typescript
interface EntityExtractor {
  // Extract structured data from natural language
  extract(
    userMessage: string, 
    currentContext: InterviewContext
  ): Promise<ExtractedEntities>;
}

// Example extractions:
// "I'm a DeFi developer" -> { domain: 'defi', role: 'developer' }
// "I want tight security" -> { priority: 'security', constraints: { privacy: 'high' } }
// "Make it quick" -> { personality: { verbosity: 'brief' } }
```

---

## 📊 Success Metrics

### Primary Metrics
- **Interview Completion Rate:** Target >85% (vs current ~70%)
- **Time to Complete:** Target <5 minutes (vs current ~8 minutes)
- **User Satisfaction:** Target NPS >50
- **Config Accuracy:** Target <5% need major post-creation edits

### Secondary Metrics
- **Skill Discovery Rate:** % of users who add recommended skills
- **Clarification Rate:** How often system needs to ask follow-ups
- **Abandonment Points:** Where users drop off in conversation

### Qualitative Feedback
- "Did the conversation feel natural?"
- "Did you feel understood?"
- "Was the final configuration what you expected?"

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up LLM client integration
- [ ] Build conversation state management
- [ ] Create basic message UI components
- [ ] Implement intent detection system

### Phase 2: Core Logic (Week 2)
- [ ] Build entity extraction pipeline
- [ ] Create context management system
- [ ] Implement skill recommendation engine
- [ ] Add conversation flow logic

### Phase 3: UI/UX (Week 3)
- [ ] Build chat interface
- [ ] Create live preview panel
- [ ] Add quick action buttons
- [ ] Implement progress tracking

### Phase 4: Polish (Week 4)
- [ ] Add rich content (skill cards, etc.)
- [ ] Implement typing indicators
- [ ] Add conversation persistence
- [ ] Create admin analytics dashboard

### Phase 5: Testing (Week 5)
- [ ] User testing with 20 beta users
- [ ] A/B test vs current form flow
- [ ] Iterate based on feedback
- [ ] Performance optimization

---

## 💰 Cost Analysis

### Per-Interview Cost (GPT-4)
- Average 15 messages per interview
- ~500 tokens per message (input + output)
- Cost: ~$0.15 per interview
- At 1000 interviews/month: $150

### Optimization Strategies
1. **Hybrid Approach:** Use GPT-4 for complex decisions, rule-based for simple ones
2. **Caching:** Cache common responses and entity extractions
3. **Compression:** Summarize conversation history to reduce tokens
4. **Fallback:** Switch to Claude 3 for simple queries

### Infrastructure Costs
- **LLM API:** ~$150-500/month depending on volume
- **Additional Compute:** ~$50/month for processing
- **Storage:** ~$10/month for conversation history
- **Total:** ~$200-600/month

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM hallucinations | High | Medium | Fact-check skill suggestions against registry |
| User confusion | Medium | Medium | Always provide "Back" option, clear progress indicators |
| Slow responses | Medium | High | Streaming responses, caching, fallback to rules |
| High costs | Medium | Medium | Usage monitoring, rate limits, hybrid approach |
| Privacy concerns | Low | High | No conversation storage, local processing option |

---

## 🎯 Decision Points

### Before Implementation:

1. **LLM Provider:** Which model to use?
   - GPT-4 for best experience
   - Claude 3 for cost balance
   - Local model for privacy

2. **Conversation Persistence:** Store conversation history?
   - Yes: Better UX (resume later), analytics
   - No: Better privacy, simpler

3. **Hybrid vs Pure AI:** Use rules + AI or pure LLM?
   - Hybrid: More predictable, cheaper
   - Pure AI: More natural, flexible

### Recommended Approach:
- **LLM:** GPT-4 with Claude 3 fallback
- **Persistence:** Store locally (user's device), optional cloud backup
- **Architecture:** Hybrid (rules for simple flows, AI for complex understanding)

---

## 📚 Resources

### Similar Implementations
- **Vercel AI SDK:** Good reference for streaming responses
- **ChatGPT:** Conversation UI patterns
- **Character.AI:** Personality configuration via chat

### Libraries to Consider
- **LangChain:** Conversation memory, chain management
- **Vercel AI SDK:** React hooks for streaming
- **Zod:** Structured output validation

---

**Document Status:** Draft  
**Last Updated:** February 15, 2026  
**Next Review:** Upon v2.0 Launch  
**Owner:** Development Team

