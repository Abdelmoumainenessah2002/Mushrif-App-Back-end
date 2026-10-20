const crypto = require('crypto');
const redisService = require('./redis.service');
const { getRedisClient, isRedisReady, waitForRedisReady } = require('../config/redis');

/**
 * ============================================================================
 * Session Service - Redis Session Management (Mushrif Backend)
 * ============================================================================
 * Manages server-side Redis sessions for the Access/Refresh token architecture.
 *
 * Key Schema:
 * 1. Session -> User: mushrif:auth:session:{sessionId}  (Value: userId, TTL: 30 days)
 * 2. User -> Sessions: mushrif:auth:user:{userId}:sessions (SET of active sessionIds, TTL: 30 days refreshed on login)
 */

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Lua script for atomic session creation:
 * - SET mushrif:auth:session:{sessionId} -> userId (TTL 30d)
 * - SADD mushrif:auth:user:{userId}:sessions -> sessionId
 * - EXPIRE mushrif:auth:user:{userId}:sessions -> 30d
 */
const CREATE_SESSION_LUA = `
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
  redis.call('SADD', KEYS[2], ARGV[2])
  redis.call('EXPIRE', KEYS[2], ARGV[3])
  return 'OK'
`;

/**
 * Lua script for atomic single session deletion:
 * - DEL mushrif:auth:session:{sessionId}
 * - SREM mushrif:auth:user:{userId}:sessions sessionId
 * - If user session set is empty, DEL user session set
 */
const DELETE_SESSION_LUA = `
  local deleted = redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[2], ARGV[1])
  local remaining = redis.call('SCARD', KEYS[2])
  if remaining == 0 then
    redis.call('DEL', KEYS[2])
  end
  return deleted
`;

/**
 * Lua script for atomic revocation of all sessions for a user:
 * - SMEMBERS mushrif:auth:user:{userId}:sessions
 * - DEL all individual mushrif:auth:session:{sessionId} keys
 * - DEL mushrif:auth:user:{userId}:sessions
 * - Returns the count of deleted sessions
 */
const DELETE_ALL_SESSIONS_LUA = `
  local sessionIds = redis.call('SMEMBERS', KEYS[1])
  local count = 0
  if sessionIds and #sessionIds > 0 then
    for i, sid in ipairs(sessionIds) do
      local sessionKey = ARGV[1] .. sid
      redis.call('DEL', sessionKey)
      count = count + 1
    end
  end
  redis.call('DEL', KEYS[1])
  return count
`;

/**
 * Builds the Redis key for a single session
 * @param {string} sessionId
 * @returns {string} Key: mushrif:auth:session:{sessionId}
 */
function getSessionKey(sessionId) {
  return redisService.buildKey('auth', 'session', sessionId);
}

/**
 * Builds the Redis key prefix for session keys
 * @returns {string} Key prefix: mushrif:auth:session:
 */
function getSessionKeyPrefix() {
  return `${redisService.buildKey('auth', 'session', '')}`;
}

/**
 * Builds the Redis key for a user's session SET
 * @param {string} userId
 * @returns {string} Key: mushrif:auth:user:{userId}:sessions
 */
function getUserSessionsKey(userId) {
  return redisService.buildKey('auth', 'user', `${userId}:sessions`);
}

/**
 * Creates a new Redis session for a user atomically via Lua script
 * @param {string|Object} userId - User ID
 * @returns {Promise<string>} Generated sessionId
 */
async function createSession(userId) {
  if (!userId) {
    throw new Error('[SessionService] userId is required to create a session');
  }

  const normalizedUserId = userId.toString();
  const sessionId = crypto.randomUUID();
  const sessionKey = getSessionKey(sessionId);
  const userSessionsKey = getUserSessionsKey(normalizedUserId);

  try {
    const ready = isRedisReady() || (await waitForRedisReady(1000));
    if (!ready) {
      throw new Error('Redis connection unavailable during session creation');
    }

    const client = getRedisClient();

    // Atomic execution of SET session key, SADD to user set, and EXPIRE on user set
    await client.eval(
      CREATE_SESSION_LUA,
      2,
      sessionKey,
      userSessionsKey,
      normalizedUserId,
      sessionId,
      SESSION_TTL_SECONDS
    );

    // Optimized non-blocking background prune of expired/stale IDs
    pruneStaleUserSessions(normalizedUserId).catch(err => {
      console.warn(`[SessionService] Background prune failed for user ${normalizedUserId}:`, err.message);
    });

    return sessionId;
  } catch (error) {
    console.error(`[SessionService] Failed to create session for user ${normalizedUserId}:`, error.message);

    // Defensive cleanup rollback in case of partial execution error
    try {
      if (isRedisReady()) {
        const client = getRedisClient();
        await client.del(sessionKey);
        await client.srem(userSessionsKey, sessionId);
      }
    } catch (rollbackErr) {
      console.error(`[SessionService] Defensive rollback failed for session ${sessionId}:`, rollbackErr.message);
    }

    throw new Error(`Session creation failed: ${error.message}`);
  }
}

/**
 * Validates a session against Redis and ensures user ownership
 * @param {string} sessionId
 * @param {string|Object} userId
 * @returns {Promise<{ valid: boolean, reason?: string, error?: boolean, message?: string }>}
 */
async function validateSession(sessionId, userId) {
  if (!sessionId || !userId) {
    return { valid: false, reason: 'INVALID_PARAMETERS' };
  }

  const normalizedUserId = userId.toString();
  const sessionKey = getSessionKey(sessionId);

  try {
    // Ensure Redis connection is active
    const ready = isRedisReady() || (await waitForRedisReady(1000));
    if (!ready) {
      return {
        error: true,
        message: 'Redis connection unavailable during session validation'
      };
    }

    const client = getRedisClient();
    const storedUserId = await client.get(sessionKey);

    if (!storedUserId) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (storedUserId !== normalizedUserId) {
      return { valid: false, reason: 'USER_MISMATCH' };
    }

    return { valid: true };
  } catch (error) {
    console.error(`[SessionService] Unexpected error validating session ${sessionId}:`, error.message);
    // Security: Do NOT fail open or treat service errors as simple invalid sessions
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Deletes a specific session atomically via Lua (single device logout)
 * @param {string|Object} userId
 * @param {string} sessionId
 * @returns {Promise<{ success?: boolean, deleted?: boolean, error?: boolean, reason?: string, message?: string }>}
 */
async function deleteSession(userId, sessionId) {
  if (!userId || !sessionId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const normalizedUserId = userId.toString();
  const sessionKey = getSessionKey(sessionId);
  const userSessionsKey = getUserSessionsKey(normalizedUserId);

  try {
    const ready = isRedisReady() || (await waitForRedisReady(1000));
    if (!ready) {
      return {
        error: true,
        message: 'Redis connection unavailable during session deletion'
      };
    }

    const client = getRedisClient();

    // Atomic deletion of session key and removal from user session set
    const deletedCount = await client.eval(
      DELETE_SESSION_LUA,
      2,
      sessionKey,
      userSessionsKey,
      sessionId
    );

    return {
      success: true,
      deleted: deletedCount > 0
    };
  } catch (error) {
    console.error(`[SessionService] Failed to delete session ${sessionId}:`, error.message);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Deletes all sessions for a user atomically via Lua (logout all devices / password change / suspension)
 * @param {string|Object} userId
 * @returns {Promise<{ success?: boolean, revokedCount?: number, error?: boolean, reason?: string, message?: string }>}
 */
async function deleteAllUserSessions(userId) {
  if (!userId) {
    return { success: false, reason: 'INVALID_PARAMETERS' };
  }

  const normalizedUserId = userId.toString();
  const userSessionsKey = getUserSessionsKey(normalizedUserId);
  const sessionKeyPrefix = getSessionKeyPrefix();

  try {
    const ready = isRedisReady() || (await waitForRedisReady(1000));
    if (!ready) {
      return {
        error: true,
        message: 'Redis connection unavailable during session revocation'
      };
    }

    const client = getRedisClient();

    // Atomic revocation of all session keys and user session set via Lua script
    const revokedCount = await client.eval(
      DELETE_ALL_SESSIONS_LUA,
      1,
      userSessionsKey,
      sessionKeyPrefix
    );

    return {
      success: true,
      revokedCount: typeof revokedCount === 'number' ? revokedCount : 0
    };
  } catch (error) {
    console.error(`[SessionService] Failed to delete all sessions for user ${normalizedUserId}:`, error.message);
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Prunes expired/stale session IDs from a user's session SET using pipelined batch operations
 * @param {string} userId
 * @returns {Promise<number>} Count of pruned stale session IDs
 */
async function pruneStaleUserSessions(userId) {
  if (!userId) return 0;

  try {
    const ready = isRedisReady();
    if (!ready) return 0;

    const client = getRedisClient();
    const userSessionsKey = getUserSessionsKey(userId.toString());
    const sessionIds = await client.smembers(userSessionsKey);

    if (!sessionIds || sessionIds.length === 0) return 0;

    // Batch existence check in a single round trip via pipeline
    const pipeline = client.pipeline();
    for (const sid of sessionIds) {
      pipeline.exists(getSessionKey(sid));
    }
    const results = await pipeline.exec();

    const staleSessionIds = [];
    sessionIds.forEach((sid, index) => {
      const [err, existsCount] = results[index] || [];
      if (!err && existsCount === 0) {
        staleSessionIds.push(sid);
      }
    });

    if (staleSessionIds.length > 0) {
      await client.srem(userSessionsKey, ...staleSessionIds);
    }

    return staleSessionIds.length;
  } catch (error) {
    console.warn(`[SessionService] Prune failed for user ${userId}:`, error.message);
    return 0;
  }
}

module.exports = {
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  pruneStaleUserSessions,
  getSessionKey,
  getSessionKeyPrefix,
  getUserSessionsKey,
  SESSION_TTL_SECONDS
};
