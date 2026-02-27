import { ActiveMemoryAPI, ReflectiveMemoryAPI } from './memoryAPI';

export class MidnightReflectionJob {
  private reflectiveAPI: ReflectiveMemoryAPI;
  private activeAPI: ActiveMemoryAPI;
  private userProfile?: string;

  constructor(userProfile?: string) {
    this.reflectiveAPI = new ReflectiveMemoryAPI();
    this.activeAPI = new ActiveMemoryAPI();
    this.userProfile = userProfile;
  }

  async run(): Promise<{
    processed: number;
    promoted: number;
    filtered: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      promoted: 0,
      filtered: 0,
      errors: [] as string[],
    };

    try {
      // Get memories older than 24 hours (ready for reflection)
      const eligibleMemories = await this.activeAPI.getMemoriesOlderThan(24);

      for (const memory of eligibleMemories) {
        try {
          results.processed++;

          const result = await this.reflectiveAPI.promote(memory, this.userProfile);

          if (result.promoted) {
            results.promoted++;
            console.log(`Promoted memory ${memory.memoryId} to reflective`);
          } else {
            results.filtered++;
            console.log(`Filtered memory ${memory.memoryId}: ${result.reason}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Memory ${memory.memoryId}: ${message}`);
          console.error(`Failed to process memory ${memory.memoryId}:`, error);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Job failed: ${message}`);
      console.error('Midnight reflection job failed:', error);
    }

    return results;
  }

  async runDaily(): Promise<void> {
    console.log('Starting midnight reflection job...');
    const results = await this.run();
    console.log('Midnight reflection complete:', results);
  }
}

export async function scheduleMidnightReflection(): Promise<void> {
  const job = new MidnightReflectionJob();
  
  // Check every hour
  setInterval(async () => {
    const now = new Date();
    
    // Run at midnight
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      await job.runDaily();
    }
  }, 60 * 60 * 1000); // Check every hour

  console.log('Midnight reflection scheduler started');
}

export const midnightReflection = new MidnightReflectionJob();
