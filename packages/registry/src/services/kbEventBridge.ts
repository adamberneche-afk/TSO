import { RCRTClient, KBEvent } from './rcrtClient';
import { prisma } from '../db';

interface KBEventQueue {
  events: KBEvent[];
  processing: boolean;
}

class KBEventBridge {
  private client: RCRTClient | null = null;
  private eventQueue: KBEventQueue = { events: [], processing: false };
  private retryAttempts = 3;
  private retryDelay = 1000;

  async initialize(userId: string): Promise<void> {
    // Get user's RCRT configuration
    const config = await prisma.$queryRaw`
      SELECT "RCRTAgent".*, "User"."walletAddress" 
      FROM "RCRTAgent" 
      JOIN "User" ON "User"."walletAddress" = "RCRTAgent"."ownerId"
      WHERE "RCRTAgent"."ownerId" = ${userId}
      AND "RCRTAgent".status = 'active'
    `;

    if (!config || (Array.isArray(config) && config.length === 0)) {
      throw new Error('RCRT not provisioned for this user');
    }

    // Initialize client with user's RCRT URL
    // In production, this would come from user settings
    const rcrtUrl = process.env.RCRT_BASE_URL || 'http://localhost:8081';
    
    // For now, we'll need to get the token from the provision
    // This is a simplified version
    this.client = null; // Will be set when we implement proper token storage
  }

  async onKBChange(kbId: string, eventType: KBEvent['eventType'], data?: any): Promise<void> {
    const event: KBEvent = {
      eventType,
      kbId,
      data,
      timestamp: new Date().toISOString()
    };

    await this.queueEvent(event);
  }

  async queueEvent(event: KBEvent): Promise<void> {
    this.eventQueue.events.push(event);
    
    if (!this.eventQueue.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.eventQueue.processing || this.eventQueue.events.length === 0) {
      return;
    }

    this.eventQueue.processing = true;

    while (this.eventQueue.events.length > 0) {
      const event = this.eventQueue.events[0];
      
      try {
        await this.sendToRCRT(event);
        this.eventQueue.events.shift();
      } catch (error) {
        console.error('Error sending event to RCRT:', error);
        
        // Implement retry logic
        const eventCopy = { ...event };
        await this.retryWithBackoff(eventCopy);
        
        // If all retries failed, remove from queue and log
        this.eventQueue.events.shift();
        console.error('Event failed after retries:', event);
      }
    }

    this.eventQueue.processing = false;
  }

  private async retryWithBackoff(event: KBEvent): Promise<void> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.sendToRCRT(event);
        return;
      } catch (error) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async sendToRCRT(event: KBEvent): Promise<void> {
    if (!this.client) {
      console.warn('RCRT client not initialized, skipping event');
      return;
    }

    await this.client.sendKBEvent(event);
  }

  // Method to set client externally (after provisioning)
  setClient(client: RCRTClient): void {
    this.client = client;
  }

  // Get queue status
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.eventQueue.events.length,
      processing: this.eventQueue.processing
    };
  }

  // Clear queue (for testing or maintenance)
  clearQueue(): void {
    this.eventQueue.events = [];
    this.eventQueue.processing = false;
  }
}

export const kbEventBridge = new KBEventBridge();
