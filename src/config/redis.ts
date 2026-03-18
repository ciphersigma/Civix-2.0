import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Initialize Upstash Redis (REST-based, no TCP connection needed)
 */
export const initRedis = async (): Promise<boolean> => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('Upstash Redis credentials not configured');
      return false;
    }

    redis = new Redis({ url, token });

    // Test connection
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Failed to initialize Upstash Redis:', error);
    redis = null;
    return false;
  }
};

/**
 * Close Redis connection (no-op for REST client)
 */
export const closeRedis = async (): Promise<void> => {
  redis = null;
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): Redis | null => {
  return redis;
};
