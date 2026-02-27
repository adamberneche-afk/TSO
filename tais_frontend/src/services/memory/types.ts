import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface WorkingMemory {
  sessionId: string;
  startedAt: Date;
  currentContext: {
    app: string;
    activeDocument?: string;
    lastMessages: Message[];
    pendingActions: string[];
    intermediateReasoning: {
      userIntent?: string;
      relevantMemories: string[];
      relevantRagDocs: string[];
    };
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ActiveMemory {
  memoryId: string;
  timestamp: Date;
  maturityState: 'active';
  privacyLevel: 'local';
  sessionSummary: {
    appContext: string;
    durationMinutes: number;
    conversationSummary: string;
    userGoals: string[];
  };
  interactions: Interaction[];
  taskOutcomes: TaskOutcome[];
  citations: Citation[];
  tags: string[];
  linkedDocuments: string[];
  validationStatus: ValidationStatus | null;
  relevanceScore: number | null;
  reflection: Reflection | null;
}

export interface Interaction {
  type: 'user_request' | 'agent_action' | 'user_correction' | 'agent_learning';
  content: string;
  timestamp: Date;
  metadata?: {
    toolUsed?: string;
    apiCalled?: string;
    fileModified?: string;
  };
}

export interface TaskOutcome {
  task: string;
  status: 'success' | 'success_with_correction' | 'failure' | 'partial';
  initialAttempt?: string;
  finalResult?: string;
  correctionRequired: boolean;
  learning?: string;
}

export interface Citation {
  citationId: string;
  type: 'file' | 'api_response' | 'rag_chunk' | 'user_statement';
  source: string;
  contentSnapshot?: string;
  lineRange?: [number, number];
  verified: boolean;
  verificationTimestamp?: Date;
}

export interface ValidationStatus {
  citationsChecked: number;
  citationsValid: number;
  validPercentage: number;
  reliable: boolean;
  checkedAt: Date;
}

export interface Reflection {
  learnings: Learning[];
  decisions: Decision[];
  corrections: Correction[];
  patterns: Pattern[];
  contradictions: Contradiction[];
}

export interface Learning {
  type: 'preference' | 'constraint' | 'workflow' | 'communication_style';
  content: string;
  confidence: number;
  evidence: string[];
  citations: string[];
  actionableImplication: string;
  applicableContexts: string[];
}

export interface Decision {
  what: string;
  why: string;
  alternativesConsidered: string[];
  success: boolean;
  correctionsApplied: string[];
  futureImplications: string;
}

export interface Correction {
  whatWasWrong: string;
  userCorrection: string;
  rootCause: string;
  preventionStrategy: string;
}

export interface Pattern {
  pattern: string;
  frequency: number;
  confidence: number;
  recommendation: string;
  examples: string[];
}

export interface Contradiction {
  currentBehavior: string;
  contradictsMemory: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface ReflectiveMemory extends ActiveMemory {
  maturityState: 'reflective';
  validationStatus: ValidationStatus;
  relevanceScore: number;
  reflection: Reflection;
  transitionedAt: Date;
}

export interface ImmutableMemory extends ReflectiveMemory {
  maturityState: 'immutable';
  lockedAt: Date;
  citationSnapshots: CitationSnapshot[];
}

export interface CitationSnapshot {
  citationId: string;
  type: 'file';
  source: string;
  contentSnapshot: string;
  snapshotTimestamp: Date;
  gitCommit?: string;
}

export interface CoreMemory {
  memoryId: string;
  sourceMemoryId: string;
  promotedAt: Date;
  mutability: 'eternal' | 'stable' | 'adaptive' | 'experimental';
  content: string;
  evidence: string[];
  confidence: number;
  implications: string;
  applicableContexts: string[];
}

interface TAISMemoryDB extends DBSchema {
  workingMemory: {
    key: string;
    value: WorkingMemory;
  };
  activeMemory: {
    key: string;
    value: ActiveMemory;
    indexes: {
      'by-timestamp': Date;
      'by-tags': string[];
    };
  };
  reflectiveMemory: {
    key: string;
    value: ReflectiveMemory;
    indexes: {
      'by-timestamp': Date;
      'by-relevance': number;
    };
  };
  immutableMemory: {
    key: string;
    value: ImmutableMemory;
    indexes: {
      'by-timestamp': Date;
    };
  };
  coreMemory: {
    key: string;
    value: CoreMemory;
    indexes: {
      'by-promoted': Date;
      'by-mutability': string;
    };
  };
  metaMemory: {
    key: string;
    value: MetaMemory;
    indexes: {
      'by-reinforced': Date;
      'by-contradicted': Date;
    };
  };
}

let dbInstance: IDBPDatabase<TAISMemoryDB> | null = null;

export async function getMemoryDB(): Promise<IDBPDatabase<TAISMemoryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TAISMemoryDB>('tais-memory', 1, {
    upgrade(db) {
      // Working memory (ephemeral)
      if (!db.objectStoreNames.contains('workingMemory')) {
        db.createObjectStore('workingMemory', { keyPath: 'sessionId' });
      }

      // Active memory (0-24h)
      if (!db.objectStoreNames.contains('activeMemory')) {
        const activeStore = db.createObjectStore('activeMemory', { keyPath: 'memoryId' });
        activeStore.createIndex('by-timestamp', 'timestamp');
        activeStore.createIndex('by-tags', 'tags', { multiEntry: true });
      }

      // Reflective memory (24h-7d)
      if (!db.objectStoreNames.contains('reflectiveMemory')) {
        const reflectiveStore = db.createObjectStore('reflectiveMemory', { keyPath: 'memoryId' });
        reflectiveStore.createIndex('by-timestamp', 'timestamp');
        reflectiveStore.createIndex('by-relevance', 'relevanceScore');
      }

      // Immutable memory (7d+)
      if (!db.objectStoreNames.contains('immutableMemory')) {
        const immutableStore = db.createObjectStore('immutableMemory', { keyPath: 'memoryId' });
        immutableStore.createIndex('by-timestamp', 'timestamp');
      }

      // Core memory
      if (!db.objectStoreNames.contains('coreMemory')) {
        const coreStore = db.createObjectStore('coreMemory', { keyPath: 'memoryId' });
        coreStore.createIndex('by-promoted', 'promotedAt');
        coreStore.createIndex('by-mutability', 'mutability');
      }

      // Meta memory
      if (!db.objectStoreNames.contains('metaMemory')) {
        const metaStore = db.createObjectStore('metaMemory', { keyPath: 'memoryId' });
        metaStore.createIndex('by-reinforced', 'lastReinforced');
        metaStore.createIndex('by-contradicted', 'lastContradicted');
      }
    },
  });

  return dbInstance;
}

export interface MetaMemory {
  memoryId: string;
  timesReinforced: number;
  lastReinforced: Date | null;
  reinforcementRate: number;
  timesContradicted: number;
  lastContradicted: Date | null;
  contradictionRate: number;
  applicableContexts: string[];
  inapplicableContexts: string[];
  confidenceTrajectory: number[];
  temporalDriftScore: number;
  recommendedAction: 'keep' | 'update' | 'delete' | 'contextualize';
  recommendedActionReason: string;
}
