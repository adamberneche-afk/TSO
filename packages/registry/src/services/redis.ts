import Redis from 'ioredis';

// Support both REDIS_URL and Upstash-style variables
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let isRedisConnected = false;

// Initialize Redis connection if URL is provided
if (REDIS_URL) {
  try {
    // Decode URL if it's URL-encoded
    let connectionUrl = decodeURIComponent(REDIS_URL);
    
    // For Upstash, construct URL with token if provided separately
    if (REDIS_TOKEN && !connectionUrl.includes('@')) {
      connectionUrl = connectionUrl.replace('https://', `https://default:${REDIS_TOKEN}@`);
    }
    
    console.log('[Redis] Connecting to:', connectionUrl.replace(/:[^:@]+@/, ':***@'));
    
    redis = new Redis(connectionUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('[Redis] Max retries reached, falling back to in-memory cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: () => {
        console.log('[Redis] Reconnecting on error...');
        return true;
      },
    });

    redis.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
      isRedisConnected = false;
      console.log('[Redis] Error:', err.message);
    });

    redis.on('close', () => {
      isRedisConnected = false;
      console.log('[Redis] Connection closed');
    });
  } catch (error) {
    console.log('[Redis] Failed to initialize:', error);
    redis = null;
  }
} else {
  console.log('ℹ️  Redis not configured (REDIS_URL not set)');
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

const DEFAULT_TTL = 900; // 15 minutes

/**
 * Get a value from cache (Redis or in-memory fallback)
 */
export async function cacheGet<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
  const prefix = options.prefix || 'tais';
  const cacheKey = `${prefix}:${key}`;

  if (redis && isRedisConnected) {
    try {
      const data = await redis.get(cacheKey);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      console.error('[Redis] Get error:', error);
      return null;
    }
  }

  // Fallback to in-memory (not implemented - would need separate in-memory store)
  return null;
}

/**
 * Set a value in cache (Redis or in-memory fallback)
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  const prefix = options.prefix || 'tais';
  const cacheKey = `${prefix}:${key}`;
  const ttl = options.ttl || DEFAULT_TTL;

  if (redis && isRedisConnected) {
    try {
      await redis.setex(cacheKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('[Redis] Set error:', error);
      return false;
    }
  }

  return false;
}

/**
 * Delete a key from cache
 */
export async function cacheDelete(key: string, options: CacheOptions = {}): Promise<boolean> {
  const prefix = options.prefix || 'tais';
  const cacheKey = `${prefix}:${key}`;

  if (redis && isRedisConnected) {
    try {
      await redis.del(cacheKey);
      return true;
    } catch (error) {
      console.error('[Redis] Delete error:', error);
      return false;
    }
  }

  return false;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isRedisConnected && redis !== null;
}

/**
 * Get Redis connection status
 */
export function getRedisStatus(): {
  available: boolean;
  provider: 'upstash' | 'none';
  connectionStatus: string;
} {
  if (!REDIS_URL) {
    return {
      available: false,
      provider: 'none',
      connectionStatus: 'Not configured',
    };
  }

  if (isRedisConnected) {
    return {
      available: true,
      provider: 'upstash',
      connectionStatus: 'Connected',
    };
  }

  return {
    available: false,
    provider: 'upstash',
    connectionStatus: 'Disconnected',
  };
}

/**
 * Get cache statistics from Redis
 */
export async function getRedisStats(): Promise<{
  usedMemory: string;
  connectedClients: number;
  uptime: number;
} | null> {
  if (!redis || !isRedisConnected) {
    return null;
  }

  try {
    const info = await redis.info('memory');
    const stats = await redis.info('stats');
    const uptime = await redis.info('server');

    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const clientsMatch = stats.match(/connected_clients:(\d+)/);
    const uptimeMatch = uptime.match(/uptime_in_days:(\d+)/);

    return {
      usedMemory: memoryMatch ? memoryMatch[1] : 'unknown',
      connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
      uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0,
    };
  } catch (error) {
    console.error('[Redis] Stats error:', error);
    return null;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isRedisConnected = false;
    console.log('[Redis] Connection closed');
  }
}

export { redis, isRedisConnected };
