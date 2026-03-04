export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  entities?: ExtractedEntity[];
  intent?: string;
  sentiment?: number;
}

export interface ExtractedEntity {
  type: 'skill' | 'experience' | 'technology' | 'duration' | 'proficiency' | 'role' | 'company' | 'date';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface ConversationSession {
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

export interface FixedQuestion {
  id: string;
  question: string;
  category: 'background' | 'skills' | 'goals';
  expectedEntities: string[];
}

export const FIXED_QUESTIONS: FixedQuestion[] = [
  {
    id: 'q1',
    question: 'Tell me about your professional background and what you\'re currently working on.',
    category: 'background',
    expectedEntities: ['role', 'company', 'experience', 'technology']
  },
  {
    id: 'q2',
    question: 'What are your core technical skills and which technologies are you most proficient with?',
    category: 'skills',
    expectedEntities: ['skill', 'technology', 'proficiency', 'duration']
  },
  {
    id: 'q3',
    question: 'What are your career goals and what type of projects are you looking to work on?',
    category: 'goals',
    expectedEntities: ['role', 'technology', 'experience']
  }
];

export interface ConversationStarter {
  id: string;
  prompt: string;
  type: 'user-led' | 'agent-led';
}

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  // User-led prompts (10) - User describes what they want to explore
  {
    id: 'cs1',
    prompt: 'I was thinking about a project I worked on recently that taught me something important...',
    type: 'user-led'
  },
  {
    id: 'cs2',
    prompt: 'There\'s a problem I\'ve been trying to solve involving...',
    type: 'user-led'
  },
  {
    id: 'cs3',
    prompt: 'I want to build or create something that...',
    type: 'user-led'
  },
  {
    id: 'cs4',
    prompt: 'I had an experience recently that changed how I think about...',
    type: 'user-led'
  },
  {
    id: 'cs5',
    prompt: 'There\'s a pattern I\'ve noticed in my work that I\'d like to explore...',
    type: 'user-led'
  },
  {
    id: 'cs6',
    prompt: 'I\'ve been struggling with a decision about...',
    type: 'user-led'
  },
  {
    id: 'cs7',
    prompt: 'A memory keeps coming up that relates to...',
    type: 'user-led'
  },
  {
    id: 'cs8',
    prompt: 'I learned something recently that challenged my assumptions about...',
    type: 'user-led'
  },
  {
    id: 'cs9',
    prompt: 'I want to document or figure out how to approach...',
    type: 'user-led'
  },
  {
    id: 'cs10',
    prompt: 'The most valuable insight I\'ve gained recently is...',
    type: 'user-led'
  },
  // Agent-led prompts (10) - Agent asks open question
  {
    id: 'cs11',
    prompt: 'What\'s been on your mind lately that you\'d like to explore?',
    type: 'agent-led'
  },
  {
    id: 'cs12',
    prompt: 'What would you like to build or create today?',
    type: 'agent-led'
  },
  {
    id: 'cs13',
    prompt: 'What\'s a challenge you\'re currently facing that I can help you think through?',
    type: 'agent-led'
  },
  {
    id: 'cs14',
    prompt: 'What context would be helpful for me to understand about your current situation?',
    type: 'agent-led'
  },
  {
    id: 'cs15',
    prompt: 'What\'s something from your past that still influences how you approach your work?',
    type: 'agent-led'
  },
  {
    id: 'cs16',
    prompt: 'What decision have you been putting off that we could discuss?',
    type: 'agent-led'
  },
  {
    id: 'cs17',
    prompt: 'What would you like to accomplish in our session today?',
    type: 'agent-led'
  },
  {
    id: 'cs18',
    prompt: 'What\'s a topic or concept you\'d like to dig deeper into?',
    type: 'agent-led'
  },
  {
    id: 'cs19',
    prompt: 'What\'s something you\'ve been meaning to document or remember?',
    type: 'agent-led'
  },
  {
    id: 'cs20',
    prompt: 'What memory or experience feels relevant to what you\'re working on now?',
    type: 'agent-led'
  }
];

export function getRandomStarter(): ConversationStarter {
  const index = Math.floor(Math.random() * CONVERSATION_STARTERS.length);
  return CONVERSATION_STARTERS[index];
}
