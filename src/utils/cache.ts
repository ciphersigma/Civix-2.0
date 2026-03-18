import { getRedisClient } from '../config/redis';

export const cacheGet = async (key: string): Promise<string | null> => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const val = await client.get<string>(key);
    return val ?? null;
  } catch (error) {
    console.error(`Cache get error for key "${key}":`, error);
    return null;
  }
};

export const cacheGetJSON = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    // Upstash auto-deserializes JSON
    const val = await client.get<T>(key);
    return val ?? null;
  } catch (error) {
    console.error(`Cache get JSON error for key "${key}":`, error);
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttlSeconds?: number): Promise<boolean> => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Cache set error for key "${key}":`, error);
    return false;
  }
};

export const cacheSetJSON = async <T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await client.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error(`Cache set JSON error for key "${key}":`, error);
    return false;
  }
};

export const cacheDel = async (key: string): Promise<boolean> => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key "${key}":`, error);
    return false;
  }
};

export const cacheDelMultiple = async (keys: string[]): Promise<number> => {
  const client = getRedisClient();
  if (!client || keys.length === 0) return 0;
  try {
    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Cache delete multiple error:', error);
    return 0;
  }
};

export const cacheKeys = async (pattern: string): Promise<string[]> => {
  const client = getRedisClient();
  if (!client) return [];
  try {
    const keys: string[] = [];
    let cursor: number = 0;
    do {
      const [nextCursor, batch] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      keys.push(...batch);
    } while (cursor !== 0);
    return keys;
  } catch (error) {
    console.error(`Cache keys error for pattern "${pattern}":`, error);
    return [];
  }
};
