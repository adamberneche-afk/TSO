import {
  WorkingMemory,
  Message,
  ActiveMemory,
  Interaction,
  TaskOutcome,
  Citation,
  getMemoryDB,
  MetaMemory,
  ReflectiveMemory,
} from './types';
import { citationValidator, relevanceFilter } from './citationValidator';
import { reflectionSynthesizer } from './reflectionSynthesizer';

const MAX_WORKING_MESSAGES = 10;
const MAX_WORKING_SIZE_KB = 50;

export class WorkingMemoryAPI {
  private sessionId: string;
  private memory: WorkingMemory | null = null;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
  }

  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `sess_${dateStr}_${random}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async initialize(appContext: string = 'unknown'): Promise<void> {
    this.memory = {
      sessionId: this.sessionId,
      startedAt: new Date(),
      currentContext: {
        app: appContext,
        lastMessages: [],
        pendingActions: [],
        intermediateReasoning: {
          relevantMemories: [],
          relevantRagDocs: [],
        },
      },
    };

    // Store in sessionStorage for persistence within session
    sessionStorage.setItem(`working_memory_${this.sessionId}`, JSON.stringify(this.memory));
  }

  async load(): Promise<WorkingMemory | null> {
    const stored = sessionStorage.getItem(`working_memory_${this.sessionId}`);
    if (stored) {
      this.memory = JSON.parse(stored);
      return this.memory;
    }
    return null;
  }

  async addMessage(role: Message['role'], content: string): Promise<void> {
    if (!this.memory) {
      await this.initialize();
    }

    const message: Message = {
      role,
      content,
      timestamp: new Date(),
    };

    this.memory!.currentContext.lastMessages.push(message);

    // Keep only last MAX_WORKING_MESSAGES
    if (this.memory!.currentContext.lastMessages.length > MAX_WORKING_MESSAGES) {
      this.memory!.currentContext.lastMessages = 
        this.memory!.currentContext.lastMessages.slice(-MAX_WORKING_MESSAGES);
    }

    // Check size limit
    const sizeKB = new Blob([JSON.stringify(this.memory)]).size / 1024;
    if (sizeKB > MAX_WORKING_SIZE_KB) {
      // Trim messages further if over limit
      this.memory!.currentContext.lastMessages = 
        this.memory!.currentContext.lastMessages.slice(-5);
    }

    this.persist();
  }

  async addPendingAction(action: string): Promise<void> {
    if (!this.memory) {
      await this.initialize();
    }
    this.memory!.currentContext.pendingActions.push(action);
    this.persist();
  }

  async removePendingAction(action: string): Promise<void> {
    if (!this.memory) return;
    this.memory!.currentContext.pendingActions = 
      this.memory!.currentContext.pendingActions.filter(a => a !== action);
    this.persist();
  }

  async setUserIntent(intent: string): Promise<void> {
    if (!this.memory) {
      await this.initialize();
    }
    this.memory!.currentContext.intermediateReasoning.userIntent = intent;
    this.persist();
  }

  async addRelevantMemory(memoryId: string): Promise<void> {
    if (!this.memory) return;
    if (!this.memory!.currentContext.intermediateReasoning.relevantMemories.includes(memoryId)) {
      this.memory!.currentContext.intermediateReasoning.relevantMemories.push(memoryId);
      this.persist();
    }
  }

  async addRelevantRagDoc(docId: string): Promise<void> {
    if (!this.memory) return;
    if (!this.memory!.currentContext.intermediateReasoning.relevantRagDocs.includes(docId)) {
      this.memory!.currentContext.intermediateReasoning.relevantRagDocs.push(docId);
      this.persist();
    }
  }

  async getContext(): Promise<WorkingMemory['currentContext'] | null> {
    if (!this.memory) {
      await this.load();
    }
    return this.memory?.currentContext || null;
  }

  private persist(): void {
    if (this.memory) {
      sessionStorage.setItem(`working_memory_${this.sessionId}`, JSON.stringify(this.memory));
    }
  }

  async clear(): Promise<void> {
    sessionStorage.removeItem(`working_memory_${this.sessionId}`);
    this.memory = null;
  }
}

export class ActiveMemoryAPI {
  private generateMemoryId(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `mem_${dateStr}_${random}`;
  }

  async createFromSession(workingMemory: WorkingMemory): Promise<ActiveMemory> {
    const db = await getMemoryDB();

    const summary = this.generateSessionSummary(workingMemory);
    const durationMinutes = Math.round(
      (new Date().getTime() - workingMemory.startedAt.getTime()) / 60000
    );

    const activeMemory: ActiveMemory = {
      memoryId: this.generateMemoryId(),
      timestamp: workingMemory.startedAt,
      maturityState: 'active',
      privacyLevel: 'local',
      sessionSummary: {
        appContext: workingMemory.currentContext.app,
        durationMinutes,
        conversationSummary: summary.conversationSummary,
        userGoals: summary.userGoals,
      },
      interactions: this.extractInteractions(workingMemory),
      taskOutcomes: [],
      citations: [],
      tags: this.extractTags(workingMemory),
      linkedDocuments: workingMemory.currentContext.intermediateReasoning.relevantRagDocs,
      validationStatus: null,
      relevanceScore: null,
      reflection: null,
    };

    await db.put('activeMemory', activeMemory);
    return activeMemory;
  }

  private generateSessionSummary(
    workingMemory: WorkingMemory
  ): { conversationSummary: string; userGoals: string[] } {
    const messages = workingMemory.currentContext.lastMessages;
    const userMessages = messages.filter(m => m.role === 'user');
    
    const conversationSummary = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content.substring(0, 100) + '...'
      : 'Session with agent';

    const userGoals = workingMemory.currentContext.intermediateReasoning.userIntent
      ? [workingMemory.currentContext.intermediateReasoning.userIntent]
      : [];

    return { conversationSummary, userGoals };
  }

  private extractInteractions(workingMemory: WorkingMemory): Interaction[] {
    return workingMemory.currentContext.lastMessages.map((msg, idx) => ({
      type: idx === 0 ? 'user_request' : (msg.role === 'user' ? 'user_request' : 'agent_action'),
      content: msg.content,
      timestamp: msg.timestamp,
    }));
  }

  private extractTags(workingMemory: WorkingMemory): string[] {
    const tags: string[] = [workingMemory.currentContext.app];
    if (workingMemory.currentContext.activeDocument) {
      tags.push('document');
    }
    if (workingMemory.currentContext.pendingActions.length > 0) {
      tags.push('action');
    }
    return tags;
  }

  async get(memoryId: string): Promise<ActiveMemory | undefined> {
    const db = await getMemoryDB();
    return db.get('activeMemory', memoryId);
  }

  async listForToday(): Promise<ActiveMemory[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('activeMemory');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return all.filter(m => new Date(m.timestamp) >= today);
  }

  async listForUser(userId: string, limit: number = 20): Promise<ActiveMemory[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('activeMemory');
    return all.slice(-limit).reverse();
  }

  async addInteraction(memoryId: string, interaction: Interaction): Promise<void> {
    const db = await getMemoryDB();
    const memory = await db.get('activeMemory', memoryId);
    if (memory) {
      memory.interactions.push(interaction);
      await db.put('activeMemory', memory);
    }
  }

  async addTaskOutcome(memoryId: string, outcome: TaskOutcome): Promise<void> {
    const db = await getMemoryDB();
    const memory = await db.get('activeMemory', memoryId);
    if (memory) {
      memory.taskOutcomes.push(outcome);
      await db.put('activeMemory', memory);
    }
  }

  async addCitation(memoryId: string, citation: Citation): Promise<void> {
    const db = await getMemoryDB();
    const memory = await db.get('activeMemory', memoryId);
    if (memory) {
      memory.citations.push(citation);
      await db.put('activeMemory', memory);
    }
  }

  async delete(memoryId: string): Promise<void> {
    const db = await getMemoryDB();
    await db.delete('activeMemory', memoryId);
  }

  async getMemoriesOlderThan(hours: number): Promise<ActiveMemory[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('activeMemory');
    
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return all.filter(m => new Date(m.timestamp) < cutoff);
  }
}

export class ReflectiveMemoryAPI {
  async promote(activeMemory: ActiveMemory, userProfile?: string): Promise<{ promoted: boolean; reason?: string; memory?: ReflectiveMemory }> {
    const db = await getMemoryDB();

    // Step 1: Validate citations
    const validationStatus = await citationValidator.validate(activeMemory);
    
    // If citations are invalid (< 50%), apply penalty later
    const validationPenalty = validationStatus.reliable ? 1.0 : 0.5;

    // Step 2: Filter relevance
    const filtered = await relevanceFilter.filter(activeMemory);
    
    // Apply validation penalty to relevance score
    const adjustedScore = filtered.score * validationPenalty;

    // Step 3: Check if should promote
    if (!filtered.shouldPromote && adjustedScore < relevanceFilter.getThreshold()) {
      return {
        promoted: false,
        reason: `Relevance score ${adjustedScore.toFixed(2)} below threshold ${relevanceFilter.getThreshold()}`,
      };
    }

    // Step 4: Generate reflection (LLM synthesis)
    let reflection = null;
    try {
      reflection = await reflectionSynthesizer.generate(activeMemory, userProfile);
    } catch (error) {
      console.error('Reflection generation failed:', error);
      // Continue without reflection if LLM fails
    }

    const reflectiveMemory: ReflectiveMemory = {
      ...activeMemory,
      maturityState: 'reflective',
      validationStatus,
      relevanceScore: adjustedScore,
      reflection,
      transitionedAt: new Date(),
    };

    await db.put('reflectiveMemory', reflectiveMemory);
    await db.delete('activeMemory', activeMemory.memoryId);

    return {
      promoted: true,
      memory: reflectiveMemory,
    };
  }

  async promoteWithValidation(activeMemory: ActiveMemory): Promise<{
    validation: typeof activeMemory.validationStatus;
    filtering: { score: number; shouldPromote: boolean };
    reflection: typeof activeMemory.reflection;
    result: ReflectiveMemory | null;
  }> {
    // Run all steps and return detailed results
    const validation = await citationValidator.validate(activeMemory);
    const filtering = await relevanceFilter.filter(activeMemory);
    
    let reflection = null;
    try {
      reflection = await reflectionSynthesizer.generate(activeMemory);
    } catch (e) {
      console.error('Reflection failed:', e);
    }

    const result = filtering.shouldPromote ? await this.promote(activeMemory) : { promoted: false };

    return {
      validation,
      filtering: { score: filtering.score, shouldPromote: filtering.shouldPromote },
      reflection,
      result: result.memory || null,
    };
  }

  async get(memoryId: string): Promise<ReflectiveMemory | undefined> {
    const db = await getMemoryDB();
    return db.get('reflectiveMemory', memoryId);
  }

  async listForUser(limit: number = 20): Promise<ReflectiveMemory[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('reflectiveMemory');
    return all.slice(-limit).reverse();
  }

  async getMemoriesOlderThan(days: number): Promise<ReflectiveMemory[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('reflectiveMemory');
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return all.filter(m => new Date(m.timestamp) < cutoff);
  }
}

export class CoreMemoryAPI {
  async promote(
    memoryId: string,
    mutability: 'eternal' | 'stable' | 'adaptive' | 'experimental'
  ): Promise<void> {
    const db = await getMemoryDB();
    
    // Try to find in reflective memory first, then immutable
    let sourceMemory = await db.get('reflectiveMemory', memoryId);
    if (!sourceMemory) {
      sourceMemory = await db.get('immutableMemory', memoryId);
    }
    
    if (!sourceMemory || !sourceMemory.reflection?.learnings[0]) {
      throw new Error('Memory not found or has no learnings');
    }

    const learning = sourceMemory.reflection.learnings[0];
    
    const coreMemory = {
      memoryId: `core_${Date.now()}`,
      sourceMemoryId: memoryId,
      promotedAt: new Date(),
      mutability,
      content: learning.content,
      evidence: learning.evidence,
      confidence: learning.confidence,
      implications: learning.actionableImplication,
      applicableContexts: learning.applicableContexts,
    };

    await db.put('coreMemory', coreMemory);
  }

  async list(): Promise<any[]> {
    const db = await getMemoryDB();
    return db.getAll('coreMemory');
  }

  async delete(memoryId: string): Promise<void> {
    const db = await getMemoryDB();
    await db.delete('coreMemory', memoryId);
  }
}

export class MetaMemoryAPI {
  async get(memoryId: string): Promise<MetaMemory | undefined> {
    const db = await getMemoryDB();
    return db.get('metaMemory', memoryId);
  }

  async updateReinforcement(memoryId: string): Promise<void> {
    const db = await getMemoryDB();
    let meta = await db.get('metaMemory', memoryId);

    if (!meta) {
      meta = {
        memoryId,
        timesReinforced: 0,
        lastReinforced: null,
        reinforcementRate: 0,
        timesContradicted: 0,
        lastContradicted: null,
        contradictionRate: 0,
        applicableContexts: [],
        inapplicableContexts: [],
        confidenceTrajectory: [],
        temporalDriftScore: 0,
        recommendedAction: 'keep',
        recommendedActionReason: 'New memory',
      };
    }

    meta.timesReinforced += 1;
    meta.lastReinforced = new Date();
    meta.confidenceTrajectory.push(Math.min(1, (meta.confidenceTrajectory[meta.confidenceTrajectory.length - 1] || 0.5) + 0.02));

    await db.put('metaMemory', meta);
  }

  async updateContradiction(memoryId: string): Promise<void> {
    const db = await getMemoryDB();
    let meta = await db.get('metaMemory', memoryId);

    if (!meta) {
      meta = {
        memoryId,
        timesReinforced: 0,
        lastReinforced: null,
        reinforcementRate: 0,
        timesContradicted: 0,
        lastContradicted: null,
        contradictionRate: 0,
        applicableContexts: [],
        inapplicableContexts: [],
        confidenceTrajectory: [0.5],
        temporalDriftScore: 0,
        recommendedAction: 'keep',
        recommendedActionReason: 'New memory',
      };
    }

    meta.timesContradicted += 1;
    meta.lastContradicted = new Date();
    
    const lastConfidence = meta.confidenceTrajectory[meta.confidenceTrajectory.length - 1] || 0.5;
    meta.confidenceTrajectory.push(Math.max(0, lastConfidence - 0.05));

    if (meta.timesContradicted / Math.max(1, meta.timesReinforced) > 0.5) {
      meta.recommendedAction = 'update';
      meta.recommendedActionReason = 'Frequent contradictions suggest outdated memory';
    }

    await db.put('metaMemory', meta);
  }
}

export class ImmutableMemoryAPI {
  async get(memoryId: string): Promise<any | undefined> {
    const db = await getMemoryDB();
    return db.get('immutableMemory', memoryId);
  }

  async list(limit: number = 50): Promise<any[]> {
    const db = await getMemoryDB();
    const all = await db.getAll('immutableMemory');
    return all.slice(-limit).reverse();
  }

  async listByWeightRange(minWeight: number, maxWeight: number): Promise<any[]> {
    const all = await this.list();
    return all.filter(m => m.weight >= minWeight && m.weight <= maxWeight);
  }

  async adjustWeight(memoryId: string, newWeight: number): Promise<boolean> {
    try {
      const db = await getMemoryDB();
      const memory = await db.get('immutableMemory', memoryId);
      
      if (!memory) {
        throw new Error('Memory not found');
      }

      memory.weight = Math.max(0.1, Math.min(2.0, newWeight));
      await db.put('immutableMemory', memory);
      return true;
    } catch (error) {
      console.error('Failed to adjust weight:', error);
      return false;
    }
  }

  async getWeight(memoryId: string): Promise<number | null> {
    try {
      const memory = await this.get(memoryId);
      return memory?.weight ?? null;
    } catch {
      return null;
    }
  }

  async getLockedCount(): Promise<number> {
    const db = await getMemoryDB();
    const all = await db.getAll('immutableMemory');
    return all.length;
  }

  async getMemoriesLockedSince(sinceDate: Date): Promise<any[]> {
    const all = await this.list();
    return all.filter(m => new Date(m.lockedAt) >= sinceDate);
  }
}

// ==================== CLOUD SYNC ====================

export async function syncMemoriesToCloud(walletAddress: string): Promise<{
  success: boolean;
  backedUp: number;
  error?: string;
}> {
  try {
    const db = await getMemoryDB();
    
    // Get all active and reflective memories
    const activeMemories = await db.getAll('activeMemory');
    const reflectiveMemories = await db.getAll('reflectiveMemory');
    
    const allMemories = [...activeMemories, ...reflectiveMemories];
    
    if (allMemories.length === 0) {
      return { success: true, backedUp: 0 };
    }

    const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/memory/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: walletAddress,
        memories: allMemories,
      }),
    });

    if (!response.ok) {
      throw new Error('Backup failed');
    }

    const result = await response.json();
    console.log('[Memory] Synced to cloud:', result);
    
    return { success: true, backedUp: result.backedUp };
  } catch (error) {
    console.error('[Memory] Cloud sync error:', error);
    return { success: false, backedUp: 0, error: String(error) };
  }
}

export async function restoreMemoriesFromCloud(walletAddress: string): Promise<{
  success: boolean;
  restored: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/memory/restore?wallet=${walletAddress}`);

    if (!response.ok) {
      throw new Error('Restore failed');
    }

    const { memories } = await response.json();
    
    if (!memories || memories.length === 0) {
      return { success: true, restored: 0 };
    }

    // Store in local IndexedDB
    const db = await getMemoryDB();
    
    for (const memory of memories) {
      await db.put('activeMemory', memory);
    }

    console.log('[Memory] Restored from cloud:', memories.length);
    
    return { success: true, restored: memories.length };
  } catch (error) {
    console.error('[Memory] Cloud restore error:', error);
    return { success: false, restored: 0, error: String(error) };
  }
}

export async function getCloudBackupStatus(walletAddress: string): Promise<{
  backedUp: number;
  lastBackup: string | null;
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_REGISTRY_URL || 'https://tso.onrender.com'}/api/v1/memory/status?wallet=${walletAddress}`);

    if (!response.ok) {
      throw new Error('Status check failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[Memory] Backup status error:', error);
    return { backedUp: 0, lastBackup: null };
  }
}
