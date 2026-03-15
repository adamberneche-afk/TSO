import { storageService } from '../../services/storage';
import { ActiveMemoryAPI } from './memoryAPI';
import { getMemoryDB } from './types';

const INITIALIZED_FLAG = 'tais_memory_initialized';

interface BrowserData {
  conversations: {
    sessionCount: number;
    totalMessages: number;
    skills: string[];
    technologies: string[];
    goals: string[];
    recentTopics: string[];
    lastActivity: Date | null;
  };
  rag: {
    documentCount: number;
    totalChunks: number;
    publicDocCount: number;
    privateDocCount: number;
    tags: string[];
  };
  settings: {
    llmProvider: string | null;
    hasApiKey: boolean;
    theme: string;
  };
  wallet: {
    connected: boolean;
    address: string | null;
  };
}

async function extractBrowserData(): Promise<BrowserData> {
  const data: BrowserData = {
    conversations: {
      sessionCount: 0,
      totalMessages: 0,
      skills: [],
      technologies: [],
      goals: [],
      recentTopics: [],
      lastActivity: null,
    },
    rag: {
      documentCount: 0,
      totalChunks: 0,
      publicDocCount: 0,
      privateDocCount: 0,
      tags: [],
    },
    settings: {
      llmProvider: null,
      hasApiKey: false,
      theme: 'dark',
    },
    wallet: {
      connected: false,
      address: null,
    },
  };

  try {
    const sessions = storageService.loadSessions();
    const sessionList = Object.values(sessions);
    
    data.conversations.sessionCount = sessionList.length;
    
    let allSkills = new Set<string>();
    let allTechnologies = new Set<string>();
    let allGoals = new Set<string>();
    let allTopics: string[] = [];
    let maxTimestamp = 0;

    for (const session of sessionList) {
      if (session.messages?.length) {
        data.conversations.totalMessages += session.messages.length;
        
        const recentMessages = session.messages.slice(-3);
        recentTopics.push(...recentMessages.map(m => m.content.substring(0, 50)));
        
        if (session.updatedAt > maxTimestamp) {
          maxTimestamp = session.updatedAt;
        }
      }
      
      if (session.extractedData) {
        session.extractedData.skills?.forEach(s => allSkills.add(s));
        session.extractedData.technologies?.forEach(t => allTechnologies.add(t));
      }
    }

    data.conversations.skills = Array.from(allSkills);
    data.conversations.technologies = Array.from(allTechnologies);
    data.conversations.recentTopics = allTopics.slice(0, 10);
    data.conversations.lastActivity = maxTimestamp > 0 ? new Date(maxTimestamp) : null;
  } catch (e) {
    console.warn('Failed to extract conversation data:', e);
  }

  try {
    const db = await getMemoryDB();
    const ragDocs = await db.getAll('activeMemory');
    const ragDocuments = ragDocs.filter(m => m.tags.includes('document'));
    
    data.rag.documentCount = ragDocuments.length;
    
    const allTags = new Set<string>();
    for (const doc of ragDocuments) {
      doc.tags?.forEach(t => allTags.add(t));
    }
    data.rag.tags = Array.from(allTags);
  } catch (e) {
    console.warn('Failed to extract RAG data:', e);
  }

  try {
    const llmSettingsRaw = localStorage.getItem('tais_llm_settings');
    if (llmSettingsRaw) {
      const llmSettings = JSON.parse(llmSettingsRaw);
      data.settings.llmProvider = llmSettings.provider || null;
    }
    
    const apiKeyData = localStorage.getItem('tais_api_keys');
    if (apiKeyData) {
      const keys = JSON.parse(apiKeyData);
      data.settings.hasApiKey = Object.keys(keys).length > 0;
    }
    
    const themeRaw = localStorage.getItem('theme');
    if (themeRaw) {
      data.settings.theme = themeRaw;
    }
  } catch (e) {
    console.warn('Failed to extract settings:', e);
  }

  try {
    const walletAddress = localStorage.getItem('wallet_address') || localStorage.getItem('walletAddress');
    data.wallet.connected = !!walletAddress;
    data.wallet.address = walletAddress;
  } catch (e) {
    console.warn('Failed to extract wallet data:', e);
  }

  return data;
}

function generateInitialMemories(data: BrowserData): Array<{
  summary: string;
  appContext: string;
  tags: string[];
  content: string;
}> {
  const memories: Array<{
    summary: string;
    appContext: string;
    tags: string[];
    content: string;
  }> = [];

  if (data.conversations.sessionCount > 0) {
    const skillsList = data.conversations.skills.slice(0, 5).join(', ');
    const techList = data.conversations.technologies.slice(0, 5).join(', ');
    
    memories.push({
      summary: `User has ${data.conversations.sessionCount} conversation sessions with ${data.conversations.totalMessages} total messages`,
      appContext: 'conversation',
      tags: ['conversation', 'history', 'initial'],
      content: `Initial memory from browser data: User has conducted ${data.conversations.sessionCount} conversation sessions with the TAIS platform, generating ${data.conversations.totalMessages} total messages. Key skills identified: ${skillsList || 'none yet'}. Technologies used: ${techList || 'none yet'}. ${
        data.conversations.lastActivity 
          ? `Last activity was on ${data.conversations.lastActivity.toLocaleDateString()}.`
          : 'No recent activity.'
      } This forms the foundation of the user's working memory profile.`,
    });
  }

  if (data.conversations.skills.length > 0) {
    memories.push({
      summary: `User has expertise in: ${data.conversations.skills.join(', ')}`,
      appContext: 'profile',
      tags: ['skills', 'expertise', 'initial'],
      content: `User expertise profile: ${data.conversations.skills.join(', ')}. These skills were extracted from their conversation history with the TAIS platform.`,
    });
  }

  if (data.conversations.technologies.length > 0) {
    memories.push({
      summary: `User works with technologies: ${data.conversations.technologies.join(', ')}`,
      appContext: 'profile',
      tags: ['technologies', 'stack', 'initial'],
      content: `Technology stack: ${data.conversations.technologies.join(', ')}. These technologies were identified from the user's interactions with the platform.`,
    });
  }

  if (data.rag.documentCount > 0) {
    memories.push({
      summary: `User has ${data.rag.documentCount} RAG documents`,
      appContext: 'rag',
      tags: ['rag', 'documents', 'initial'],
      content: `User has ${data.rag.documentCount} documents in their RAG knowledge base. Tags: ${data.rag.tags.join(', ') || 'none'}. These documents form part of the user's knowledge resources.`,
    });
  }

  if (data.wallet.connected) {
    memories.push({
      summary: 'User has connected wallet',
      appContext: 'auth',
      tags: ['wallet', 'auth', 'initial'],
      content: `User has connected wallet${data.wallet.address ? `: ${data.wallet.address.slice(0, 6)}...${data.wallet.address.slice(-4)}` : ''}. This wallet is used for authentication and NFT verification on the TAIS platform.`,
    });
  }

  if (data.settings.hasApiKey) {
    memories.push({
      summary: 'User has configured LLM API keys',
      appContext: 'settings',
      tags: ['llm', 'api', 'initial'],
      content: `User has configured ${data.settings.llmProvider || 'an'} LLM provider API key for AI interactions. This enables dynamic conversation capabilities.`,
    });
  }

  memories.push({
    summary: 'TAIS Platform user profile initialized',
    appContext: 'system',
    tags: ['initialization', 'system', 'memory-flywheel'],
    content: `Memory flywheel initialized on ${new Date().toISOString()}. This is a one-time initialization from browser data to kickstart the user's working memory. Future memories will be accumulated through ongoing interactions with the TAIS platform including conversations, RAG queries, and app usage.`,
  });

  return memories;
}

export async function initializeMemoryFromBrowser(): Promise<{
  success: boolean;
  memoriesCreated: number;
  message: string;
}> {
  try {
    if (localStorage.getItem(INITIALIZED_FLAG)) {
      return {
        success: true,
        memoriesCreated: 0,
        message: 'Memory already initialized',
      };
    }

    const browserData = await extractBrowserData();
    
    const totalData = 
      browserData.conversations.sessionCount +
      browserData.rag.documentCount +
      (browserData.wallet.connected ? 1 : 0);

    if (totalData === 0) {
      localStorage.setItem(INITIALIZED_FLAG, 'true');
      return {
        success: true,
        memoriesCreated: 0,
        message: 'No browser data found to initialize from',
      };
    }

    const initialMemories = generateInitialMemories(browserData);
    const db = await getMemoryDB();

    for (const mem of initialMemories) {
      const activeMemory = {
        memoryId: `init_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date(),
        maturityState: 'active' as const,
        privacyLevel: 'local' as const,
        sessionSummary: {
          appContext: mem.appContext,
          durationMinutes: 0,
          conversationSummary: mem.summary,
          userGoals: [],
        },
        interactions: [],
        taskOutcomes: [],
        citations: [],
        tags: mem.tags,
        linkedDocuments: [],
        validationStatus: null,
        relevanceScore: 0.8,
        reflection: null,
      };

      await db.put('activeMemory', activeMemory);
    }

    localStorage.setItem(INITIALIZED_FLAG, 'true');
    
    return {
      success: true,
      memoriesCreated: initialMemories.length,
      message: `Initialized ${initialMemories.length} memories from browser data`,
    };
  } catch (error) {
    console.error('Failed to initialize memory from browser:', error);
    return {
      success: false,
      memoriesCreated: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function isMemoryInitialized(): boolean {
  return !!localStorage.getItem(INITIALIZED_FLAG);
}

export function resetMemoryInitialization(): void {
  localStorage.removeItem(INITIALIZED_FLAG);
}
