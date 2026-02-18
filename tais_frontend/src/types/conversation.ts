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
