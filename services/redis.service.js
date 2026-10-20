const { getRedisClient, isRedisReady, pingRedis } = require('../config/redis');

/**
 * ============================================================================
 * High-Level Redis Service Abstraction (Mushrif Backend)
 * ============================================================================
 * - Safe error handling on all operations (Fail-Open / Return null on error)
 * - Automatic JSON serialization and deserialization
 * - Safe SCAN-based pattern deletion (never uses blocking KEYS command)
 * - Atomic rate limit / counter primitives
 * - Standardized key naming and namespacing
 */

const KEY_PREFIX = 'mushrif:';

/**
 * Builds a standardized, namespaced Redis key
 * Format: mushrif:<subsystem>:<entityType>:<identifier>
 * @param {string} subsystem - Subsystem (e.g., 'auth', 'cache', 'cooldown', 'geo', 'rl')
 * @param {string} entityType - Entity type (e.g., 'user', 'ip', 'login_notif', 'status')
 * @param {string|number} identifier - Unique ID, IP, or token
 * @returns {string} Fully qualified Redis key
 */
function buildKey(subsystem, entityType, identifier) {
  if (!subsystem || !entityType || identifier === undefined || identifier === null) {
    throw new Error(`[RedisService] Invalid key parameters: (${subsystem}, ${entityType}, ${identifier})`);
  }
  // Sanitize identifier to prevent injection
  const safeId = String(identifier).trim().replace(/\s+/g, '_');
  return `${KEY_PREFIX}${subsystem}:${entityType}:${safeId}`;
}

/**
 * Retrieves a value from Redis and parses JSON if applicable
 * Returns null if key does not exist, or if Redis is offline / errored (Fail-Open).
 * @param {string} key - The Redis key
 * @returns {Promise<any|null>} Parsed value or null
 */
async function get(key) {
  try {
    const client = getRedisClient();
    const rawValue = await client.get(key);
    if (!rawValue) return null;

    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue; // Return plain string if not JSON
    }
  } catch (error) {
    console.warn(`[RedisService] Failed to GET key "${key}": ${error.message}`);
    return null; // Graceful degradation (Fail-Open)
  }
}

/**
 * Sets a value in Redis with an explicit TTL (Time-To-Live)
 * Objects are automatically serialized to JSON.
 * @param {string} key - The Redis key
 * @param {any} value - The value to store
 * @param {number} ttlSeconds - Expiration time in seconds
 * @returns {Promise<boolean>} True if set successfully, false on error
 */
async function set(key, value, ttlSeconds) {
  if (!ttlSeconds || ttlSeconds <= 0) {
    throw new Error(`[RedisService] TTL in seconds is required for key "${key}"`);
  }

  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const result = await client.set(key, stringValue, 'EX', ttlSeconds);
    return result === 'OK';
  } catch (error) {
    console.warn(`[RedisService] Failed to SET key "${key}": ${error.message}`);
    return false; // Graceful degradation
  }
}

/**
 * Sets a key with TTL ONLY if it does not already exist (Atomic SET NX EX)
 * Used for cooldowns, idempotency, and distributed rate limits.
 * @param {string} key - The Redis key
 * @param {any} value - The value to store
 * @param {number} ttlSeconds - Expiration time in seconds
 * @returns {Promise<boolean|null>} True if the key was set (did not exist before), false if already exists, null on error
 */
async function setIfNotExists(key, value, ttlSeconds) {
  if (!ttlSeconds || ttlSeconds <= 0) {
    throw new Error(`[RedisService] TTL in seconds is required for key "${key}"`);
  }

  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const result = await client.set(key, stringValue, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    console.warn(`[RedisService] Failed to SET NX key "${key}": ${error.message}`);
    return null;
  }
}

/**
 * Deletes one or more keys from Redis
 * @param {string|string[]} keys - Key or array of keys to delete
 * @returns {Promise<number>} Number of keys deleted
 */
async function del(keys) {
  try {
    const client = getRedisClient();
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length === 0) return 0;
    return await client.del(...keyArray);
  } catch (error) {
    console.warn(`[RedisService] Failed to DEL keys: ${error.message}`);
    return 0;
  }
}

/**
 * Safely deletes all keys matching a pattern using non-blocking SCAN (Never KEYS *)
 * @param {string} pattern - Key pattern (e.g. 'mushrif:cache:user:*')
 * @returns {Promise<number>} Total number of matching keys deleted
 */
async function delByPattern(pattern) {
  try {
    const client = getRedisClient();
    let cursor = '0';
    let totalDeleted = 0;

    do {
      // SCAN 100 keys at a time
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys && keys.length > 0) {
        const deleted = await client.del(...keys);
        totalDeleted += deleted;
      }
    } while (cursor !== '0');

    return totalDeleted;
  } catch (error) {
    console.warn(`[RedisService] Failed to delByPattern "${pattern}": ${error.message}`);
    return 0;
  }
}

/**
 * Atomically increments a key's integer value, setting an optional TTL if the key is newly created
 * @param {string} key - The Redis key
 * @param {number} [ttlSeconds] - Optional expiration in seconds
 * @returns {Promise<number|null>} New incremented integer value, or null on error
 */
async function increment(key, ttlSeconds) {
  try {
    const client = getRedisClient();
    const newValue = await client.incr(key);
    
    // If it's a newly created key and TTL is specified, set the expiration
    if (newValue === 1 && ttlSeconds && ttlSeconds > 0) {
      await client.expire(key, ttlSeconds);
    }
    
    return newValue;
  } catch (error) {
    console.warn(`[RedisService] Failed to INCR key "${key}": ${error.message}`);
    return null;
  }
}

/**
 * Atomically decrements a key's integer value
 * @param {string} key - The Redis key
 * @returns {Promise<number|null>} New decremented integer value, or null on error
 */
async function decrement(key) {
  try {
    const client = getRedisClient();
    return await client.decr(key);
  } catch (error) {
    console.warn(`[RedisService] Failed to DECR key "${key}": ${error.message}`);
    return null;
  }
}

/**
 * Checks if a key exists in Redis
 * @param {string} key - The Redis key
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
async function exists(key) {
  try {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.warn(`[RedisService] Failed to check EXISTS for key "${key}": ${error.message}`);
    return false;
  }
}

/**
 * Returns the remaining TTL of a key in seconds
 * @param {string} key - The Redis key
 * @returns {Promise<number>} Remaining seconds, -1 if no TTL, -2 if key does not exist
 */
async function ttl(key) {
  try {
    const client = getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.warn(`[RedisService] Failed to check TTL for key "${key}": ${error.message}`);
    return -2;
  }
}

/**
 * Atomically consumes 1 token from a rate limit window (Fixed Window Counter)
 * Uses atomic Lua script: INCR + EXPIRE on first increment, returns [count, ttl]
 * @param {string} key - The Redis key
 * @param {number} limit - Maximum allowed requests in window
 * @param {number} windowSeconds - Window duration in seconds
 * @returns {Promise<{ allowed: boolean, current: number, remaining: number, ttl: number } | null>}
 */
async function consumeRateLimit(key, limit, windowSeconds) {
  if (!key || !limit || limit <= 0 || !windowSeconds || windowSeconds <= 0) {
    throw new Error(`[RedisService] Invalid rate limit parameters for key "${key}"`);
  }

  try {
    const client = getRedisClient();
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if tonumber(current) == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {current, ttl}
    `;

    const res = await client.eval(luaScript, 1, key, windowSeconds);
    if (!res || !Array.isArray(res)) {
      return null;
    }

    const count = parseInt(res[0], 10);
    const remainingTtl = Math.max(parseInt(res[1], 10), 1);
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return {
      allowed,
      current: count,
      remaining,
      ttl: remainingTtl
    };
  } catch (error) {
    console.warn(`[RedisService] Failed to consume rate limit for key "${key}": ${error.message}`);
    return null;
  }
}

/**
 * Checks service health
 * @returns {Promise<{ isReady: boolean, health: Object }>}
 */
async function checkHealth() {
  const ready = isRedisReady();
  const pingResult = await pingRedis();
  return {
    isReady: ready,
    ping: pingResult
  };
}

module.exports = {
  buildKey,
  get,
  set,
  setIfNotExists,
  del,
  delByPattern,
  increment,
  decrement,
  exists,
  ttl,
  consumeRateLimit,
  checkHealth
};
