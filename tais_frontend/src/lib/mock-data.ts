// TAIS Platform - Mock Data for Development/Testing

import { Skill } from '../types/registry';
import { AgentConfig } from '../types/agent';

export const MOCK_SKILLS: Skill[] = [
  {
    id: 'skill-1',
    name: 'WebScraper',
    version: '1.0.0',
    description: 'Extract data from websites with advanced parsing capabilities',
    skillHash: 'QmSkill1Hash',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    trustScore: 0.92,
    downloadCount: 1523,
    categories: [
      { id: 'cat-1', name: 'Data Collection' },
      { id: 'cat-2', name: 'Web' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-01T15:30:00.000Z',
  },
  {
    id: 'skill-2',
    name: 'DataAnalyzer',
    version: '2.1.0',
    description: 'Analyze datasets and generate insights with statistical methods',
    skillHash: 'QmSkill2Hash',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    trustScore: 0.88,
    downloadCount: 2341,
    categories: [
      { id: 'cat-3', name: 'Analytics' },
      { id: 'cat-4', name: 'Data Science' },
    ],
    permissions: {
      network: false,
      filesystem: true,
      api: false,
      code: true,
    },
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-02-05T12:00:00.000Z',
  },
  {
    id: 'skill-3',
    name: 'EmailAssistant',
    version: '1.5.2',
    description: 'Manage and organize emails with smart categorization',
    skillHash: 'QmSkill3Hash',
    owner: '0x9876543210987654321098765432109876543210',
    trustScore: 0.95,
    downloadCount: 4567,
    categories: [
      { id: 'cat-5', name: 'Productivity' },
      { id: 'cat-6', name: 'Communication' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2025-12-20T14:00:00.000Z',
    updatedAt: '2026-02-08T09:30:00.000Z',
  },
  {
    id: 'skill-4',
    name: 'ImageGenerator',
    version: '1.0.1',
    description: 'Create images from text descriptions using AI models',
    skillHash: 'QmSkill4Hash',
    owner: '0x1234567890123456789012345678901234567890',
    trustScore: 0.78,
    downloadCount: 892,
    categories: [
      { id: 'cat-7', name: 'Creative' },
      { id: 'cat-8', name: 'AI' },
    ],
    permissions: {
      network: true,
      filesystem: true,
      api: true,
      code: true,
    },
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-02-09T16:45:00.000Z',
  },
  {
    id: 'skill-5',
    name: 'CalendarSync',
    version: '3.0.0',
    description: 'Synchronize and manage calendar events across platforms',
    skillHash: 'QmSkill5Hash',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    trustScore: 0.91,
    downloadCount: 3124,
    categories: [
      { id: 'cat-9', name: 'Scheduling' },
      { id: 'cat-5', name: 'Productivity' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2025-11-15T09:00:00.000Z',
    updatedAt: '2026-02-07T13:20:00.000Z',
  },
  {
    id: 'skill-6',
    name: 'CodeReviewer',
    version: '1.2.0',
    description: 'Analyze code for bugs, security issues, and best practices',
    skillHash: 'QmSkill6Hash',
    owner: '0x9876543210987654321098765432109876543210',
    trustScore: 0.86,
    downloadCount: 1876,
    categories: [
      { id: 'cat-10', name: 'Development' },
      { id: 'cat-11', name: 'Code Quality' },
    ],
    permissions: {
      network: false,
      filesystem: true,
      api: false,
      code: true,
    },
    createdAt: '2026-01-05T10:30:00.000Z',
    updatedAt: '2026-02-06T11:15:00.000Z',
  },
  {
    id: 'skill-7',
    name: 'TaskManager',
    version: '2.0.0',
    description: 'Organize and prioritize tasks with intelligent scheduling',
    skillHash: 'QmSkill7Hash',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    trustScore: 0.89,
    downloadCount: 2893,
    categories: [
      { id: 'cat-5', name: 'Productivity' },
      { id: 'cat-9', name: 'Scheduling' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2025-12-10T09:00:00.000Z',
    updatedAt: '2026-02-05T14:30:00.000Z',
  },
  {
    id: 'skill-8',
    name: 'DocumentSummarizer',
    version: '1.3.0',
    description: 'Summarize long documents and extract key insights',
    skillHash: 'QmSkill8Hash',
    owner: '0x1234567890123456789012345678901234567890',
    trustScore: 0.84,
    downloadCount: 1567,
    categories: [
      { id: 'cat-3', name: 'Analytics' },
      { id: 'cat-5', name: 'Productivity' },
    ],
    permissions: {
      network: false,
      filesystem: true,
      api: true,
      code: false,
    },
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-02-08T10:15:00.000Z',
  },
  {
    id: 'skill-9',
    name: 'LanguageTranslator',
    version: '1.1.0',
    description: 'Translate text between 50+ languages with high accuracy',
    skillHash: 'QmSkill9Hash',
    owner: '0x9876543210987654321098765432109876543210',
    trustScore: 0.93,
    downloadCount: 3456,
    categories: [
      { id: 'cat-6', name: 'Communication' },
      { id: 'cat-8', name: 'AI' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2026-01-08T13:00:00.000Z',
    updatedAt: '2026-02-07T16:00:00.000Z',
  },
  {
    id: 'skill-10',
    name: 'ContentWriter',
    version: '2.5.0',
    description: 'Generate high-quality written content for various purposes',
    skillHash: 'QmSkill10Hash',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    trustScore: 0.87,
    downloadCount: 2145,
    categories: [
      { id: 'cat-7', name: 'Creative' },
      { id: 'cat-8', name: 'AI' },
    ],
    permissions: {
      network: true,
      filesystem: false,
      api: true,
      code: false,
    },
    createdAt: '2025-12-05T10:00:00.000Z',
    updatedAt: '2026-02-09T12:30:00.000Z',
  },
  {
    id: 'skill-11',
    name: 'ResearchAssistant',
    version: '1.4.0',
    description: 'Search and compile research from academic and web sources',
    skillHash: 'QmSkill11Hash',
    owner: '0x1234567890123456789012345678901234567890',
    trustScore: 0.90,
    downloadCount: 1678,
    categories: [
      { id: 'cat-2', name: 'Web' },
      { id: 'cat-4', name: 'Data Science' },
    ],
    permissions: {
      network: true,
      filesystem: true,
      api: true,
      code: false,
    },
    createdAt: '2026-01-25T14:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'skill-12',
    name: 'NoteTaker',
    version: '1.0.5',
    description: 'Capture and organize notes with smart categorization',
    skillHash: 'QmSkill12Hash',
    owner: '0x9876543210987654321098765432109876543210',
    trustScore: 0.82,
    downloadCount: 987,
    categories: [
      { id: 'cat-5', name: 'Productivity' },
    ],
    permissions: {
      network: false,
      filesystem: true,
      api: false,
      code: false,
    },
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-10T15:00:00.000Z',
  },
];

export const MOCK_AGENT_CONFIG: AgentConfig = {
  agent: {
    name: 'MyFirstAgent',
    version: '1.0.0',
    description: 'A helpful AI agent for productivity and organization',
    goals: ['work', 'organization'],
    skills: [
      {
        id: 'skill-3',
        source: 'registry',
        version: '1.5.2',
        hash: 'QmSkill3Hash',
        permissions: ['network', 'api'],
        trustScore: 0.95,
      },
      {
        id: 'skill-5',
        source: 'registry',
        version: '3.0.0',
        hash: 'QmSkill5Hash',
        permissions: ['network', 'api'],
        trustScore: 0.91,
      },
    ],
    personality: {
      tone: 'balanced',
      verbosity: 'balanced',
      formality: 'professional',
    },
    autonomy: {
      level: 'suggest',
    },
    constraints: {
      privacy: 'balanced',
      maxCostPerAction: 0.1,
      blockedModules: ['child_process'],
      maxFileSize: 1048576,
    },
    createdAt: '2026-02-10T12:00:00.000Z',
    updatedAt: '2026-02-10T12:00:00.000Z',
  },
};

// Mock trending skills
export const MOCK_TRENDING_SKILLS = [
  MOCK_SKILLS[2], // EmailAssistant
  MOCK_SKILLS[1], // DataAnalyzer
  MOCK_SKILLS[4], // CalendarSync
];

// Mock skill categories
export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Data Collection' },
  { id: 'cat-2', name: 'Web' },
  { id: 'cat-3', name: 'Analytics' },
  { id: 'cat-4', name: 'Data Science' },
  { id: 'cat-5', name: 'Productivity' },
  { id: 'cat-6', name: 'Communication' },
  { id: 'cat-7', name: 'Creative' },
  { id: 'cat-8', name: 'AI' },
  { id: 'cat-9', name: 'Scheduling' },
  { id: 'cat-10', name: 'Development' },
  { id: 'cat-11', name: 'Code Quality' },
];

/**
 * Use mock data in development when registry is unavailable
 */
export const USE_MOCK_DATA = import.meta.env.DEV && false; // Set to true to use mock data