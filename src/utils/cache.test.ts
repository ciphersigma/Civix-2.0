import { initRedis, closeRedis, isRedisConnected } from '../config/redis';
import {
  cacheGet,
  cacheSet,
  cacheGetJSON,
  cacheSetJSON,
  cacheDel,
  cacheExpire,
  cacheTTL,
  cacheExists,
  cacheIncr,
  cacheDecr,
} from './cache';

// Note: These tests require a running Redis instance
// Run: docker-compose up -d (from database directory)
// Or skip with: npm test -- --testPathIgnorePatterns=cache.test.ts

describe('Cache Utilities', () => {
  let redisAvailable = false;

  beforeAll(async () => {
    try {
      await initRedis();
      redisAvailable = isRedisConnected();
      
      if (!redisAvailable) {
        console.log('⚠️  Redis not available - skipping cache tests');
      }
    } catch (error) {
      console.log('⚠️  Redis not available - skipping cache tests');
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      await closeRedis();
    }
  });

  beforeEach(async () => {
    if (!redisAvailable) return;
    
    const testKeys = ['test:key', 'test:json', 'test:expire', 'test:counter'];
    for (const key of testKeys) {
      await cacheDel(key);
    }
  });

  describe('cacheSet and cacheGet', () => {
    it('should set and get a string value', async () => {
      if (!redisAvailable) {
        console.log('Skipping test - Redis not available');
        return;
      }

      const key = 'test:key';
      const value = 'test value';

      const setResult = await cacheSet(key, value);
      expect(setResult).toBe(true);

      const getValue = await cacheGet(key);
      expect(getValue).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      if (!redisAvailable) return;

      const getValue = await cacheGet('test:nonexistent');
      expect(getValue).toBeNull();
    });

    it('should set value with TTL', async () => {
      if (!redisAvailable) return;

      const key = 'test:key';
      const value = 'test value';
      const ttl = 10;

      await cacheSet(key, value, ttl);
      const getValue = await cacheGet(key);
      expect(getValue).toBe(value);

      const ttlValue = await cacheTTL(key);
      expect(ttlValue).toBeGreaterThan(0);
      expect(ttlValue).toBeLessThanOrEqual(ttl);
    });
  });

  describe('cacheSetJSON and cacheGetJSON', () => {
    it('should set and get a JSON object', async () => {
      if (!redisAvailable) return;

      const key = 'test:json';
      const value = { name: 'Test', count: 42, active: true };

      const setResult = await cacheSetJSON(key, value);
      expect(setResult).toBe(true);

      const getValue = await cacheGetJSON<typeof value>(key);
      expect(getValue).toEqual(value);
    });

    it('should return null for non-existent JSON key', async () => {
      if (!redisAvailable) return;

      const getValue = await cacheGetJSON('test:nonexistent');
      expect(getValue).toBeNull();
    });
  });

  describe('cacheDel', () => {
    it('should delete an existing key', async () => {
      if (!redisAvailable) return;

      const key = 'test:key';
      await cacheSet(key, 'value');

      const delResult = await cacheDel(key);
      expect(delResult).toBe(true);

      const getValue = await cacheGet(key);
      expect(getValue).toBeNull();
    });
  });

  describe('cacheExpire', () => {
    it('should set expiration on existing key', async () => {
      if (!redisAvailable) return;

      const key = 'test:expire';
      await cacheSet(key, 'value');

      const expireResult = await cacheExpire(key, 10);
      expect(expireResult).toBe(true);

      const ttl = await cacheTTL(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });
  });

  describe('cacheExists', () => {
    it('should return true for existing key', async () => {
      if (!redisAvailable) return;

      const key = 'test:key';
      await cacheSet(key, 'value');

      const exists = await cacheExists(key);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      if (!redisAvailable) return;

      const exists = await cacheExists('test:nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('cacheIncr and cacheDecr', () => {
    it('should increment a counter', async () => {
      if (!redisAvailable) return;

      const key = 'test:counter';

      const value1 = await cacheIncr(key);
      expect(value1).toBe(1);

      const value2 = await cacheIncr(key);
      expect(value2).toBe(2);

      const value3 = await cacheIncr(key, 5);
      expect(value3).toBe(7);
    });

    it('should decrement a counter', async () => {
      if (!redisAvailable) return;

      const key = 'test:counter';
      await cacheSet(key, '10');

      const value1 = await cacheDecr(key);
      expect(value1).toBe(9);

      const value2 = await cacheDecr(key, 3);
      expect(value2).toBe(6);
    });
  });
});
