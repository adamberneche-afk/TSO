# Conversation UI Components

This module provides a complete AI-powered conversation interface with TensorFlow.js integration for skill extraction and analysis.

## Features

- **Smart Conversation Flow**: 3 fixed questions that guide users through professional background, skills, and goals
- **TensorFlow.js Integration**: Uses Universal Sentence Encoder for semantic similarity and intent classification
- **Entity Extraction**: Automatically identifies skills, technologies, experience, roles, and companies
- **LocalStorage Persistence**: All conversations are automatically saved and can be resumed
- **Export Functionality**: Export conversations as JSON

## Components

### Main Components

- `ConversationUI` - Landing page and entry point
- `ConversationContainer` - Main chat interface with sidebar
- `MessageBubble` - Individual message display with entity badges
- `InputArea` - Text input with auto-resize and voice input placeholder
- `FixedQuestions` - Sidebar showing the 3 interview questions

### Hooks

- `useConversation` - Zustand store for conversation state management
- `useTensorFlow` - Hook for TensorFlow model initialization and status

### Services

- `tensorflow.ts` - USE model loading and similarity calculations
- `entityExtraction.ts` - Pattern-based entity extraction from text
- `storage.ts` - LocalStorage persistence layer

## Usage

```tsx
import { ConversationUI } from './app/components/ConversationUI';

function App() {
  return (
    <div>
      <ConversationUI />
    </div>
  );
}
```

Or use individual components:

```tsx
import { ConversationContainer } from './app/components/conversation';

function MyPage() {
  return (
    <ConversationContainer 
      onClose={() => console.log('Closed')}
      showSidebar={true}
    />
  );
}
```

## The 3 Fixed Questions

1. **Background**: "Tell me about your professional background and what you're currently working on."
2. **Skills**: "What are your core technical skills and which technologies are you most proficient with?"
3. **Goals**: "What are your career goals and what type of projects are you looking to work on?"

## Entity Types Extracted

- `skill` - General technical skills
- `technology` - Programming languages, frameworks, tools
- `experience` - Projects, achievements, responsibilities
- `duration` - Time periods (e.g., "5 years")
- `proficiency` - Skill level indicators
- `role` - Job titles and positions
- `company` - Organization names
- `date` - Time references

## Data Model

```typescript
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  entities?: ExtractedEntity[];
  intent?: string;
  sentiment?: number;
}

interface ConversationSession {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  extractedData: {
    skills: string[];
    experience: string[];
    technologies: string[];
    proficiencies: Record<string, number>;
  };
}
```

## TensorFlow.js Features

The system uses the Universal Sentence Encoder (USE) for:

1. **Intent Classification**: Categorizes user responses into intents like "describing_experience", "listing_skills", "expressing_goals"
2. **Semantic Similarity**: Compares user responses to expected answer patterns
3. **Embeddings**: Creates vector representations of text for ML processing

## Storage

Sessions are automatically persisted to localStorage under the key `conversation-storage`. The storage includes:

- All messages in each session
- Extracted entities and metadata
- Session timestamps
- Progress through the 3 questions

## Customization

### Adding Custom Questions

Edit `src/types/conversation.ts`:

```typescript
export const FIXED_QUESTIONS: FixedQuestion[] = [
  // ... existing questions
  {
    id: 'q4',
    question: 'Your custom question here',
    category: 'custom',
    expectedEntities: ['skill', 'technology']
  }
];
```

### Custom Entity Patterns

Extend `src/services/entityExtraction.ts`:

```typescript
const PATTERNS = {
  // ... existing patterns
  customEntities: [
    /\b(your pattern here)\b/gi
  ]
};
```

## API Integration

To integrate with a real backend, modify the `handleSendMessage` function in `ConversationContainer.tsx`:

```typescript
const handleSendMessage = useCallback(async (content: string) => {
  // Add user message locally
  addMessage(content, 'user', entities);
  
  // Send to backend
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: content, sessionId })
  });
  
  const data = await response.json();
  addMessage(data.reply, 'assistant', data.entities);
}, []);
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

TensorFlow.js requires WebGL support for optimal performance.
