import { getMemoryDB, ImmutableMemory, CitationSnapshot } from './types';
import { CoreMemoryAPI } from './memoryAPI';

const IMMUTABLE_LOCK_DAYS = 7;

export class ImmutableMemoryJob {
  private coreAPI: CoreMemoryAPI;

  constructor() {
    this.coreAPI = new CoreMemoryAPI();
  }

  async run(): Promise<{
    processed: number;
    locked: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      locked: 0,
      errors: [] as string[],
    };

    try {
      const db = await getMemoryDB();
      const reflectiveMemories = await db.getAll('reflectiveMemory');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - IMMUTABLE_LOCK_DAYS);

      for (const memory of reflectiveMemories) {
        try {
          results.processed++;

          const memoryDate = new Date(memory.timestamp);
          
          if (memoryDate < cutoffDate) {
            const immutableMemory: ImmutableMemory = {
              ...memory,
              maturityState: 'immutable',
              lockedAt: new Date(),
              citationSnapshots: this.createCitationSnapshots(memory),
              weight: 1.0,
            };

            await db.put('immutableMemory', immutableMemory);
            await db.delete('reflectiveMemory', memory.memoryId);

            results.locked++;
            console.log(`Locked memory ${memory.memoryId} as immutable`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Memory ${memory.memoryId}: ${message}`);
          console.error(`Failed to lock memory ${memory.memoryId}:`, error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Job failed: ${message}`);
      console.error('Immutable memory job failed:', error);
    }

    return results;
  }

  private createCitationSnapshots(memory: any): CitationSnapshot[] {
    if (!memory.citations || !Array.isArray(memory.citations)) {
      return [];
    }

    return memory.citations
      .filter((c: any) => c.type === 'file' && c.source)
      .map((c: any) => ({
        citationId: c.citationId,
        type: 'file' as const,
        source: c.source,
        contentSnapshot: c.contentSnapshot || '',
        snapshotTimestamp: new Date(),
      }));
  }

  async adjustWeight(memoryId: string, newWeight: number): Promise<boolean> {
    try {
      const db = await getMemoryDB();
      const memory = await db.get('immutableMemory', memoryId);
      
      if (!memory) {
        throw new Error('Immutable memory not found');
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
      const db = await getMemoryDB();
      const memory = await db.get('immutableMemory', memoryId);
      return memory?.weight ?? null;
    } catch (error) {
      return null;
    }
  }

  async runDaily(): Promise<void> {
    console.log('Starting immutable memory lock job...');
    const results = await this.run();
    console.log('Immutable memory lock complete:', results);
  }
}

export function scheduleImmutableMemoryJob(): void {
  const job = new ImmutableMemoryJob();
  
  setInterval(async () => {
    const now = new Date();
    
    if (now.getHours() === 1 && now.getMinutes() === 0) {
      await job.runDaily();
    }
  }, 60 * 60 * 1000);

  console.log('Immutable memory scheduler started (runs daily at 1am)');
}

export const immutableMemoryJob = new ImmutableMemoryJob();
