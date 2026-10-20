const crypto = require('crypto');
const redisService = require('../services/redis.service');
const { isRedisReady, waitForRedisReady } = require('../config/redis');

/**
 * ============================================================================
 * Login Notification Cooldown Helper (Mushrif Backend) 
 * ============================================================================
 * Prevents sending duplicate login notification emails within a 1-hour window.
 * Uses atomic Redis SET NX EX when available, with a bounded in-memory fallback.
 */

// Cooldown period: 1 hour (in seconds for Redis, milliseconds for fallback)
const NOTIFICATION_COOLDOWN_SECONDS = 3600;
const NOTIFICATION_COOLDOWN_MS = NOTIFICATION_COOLDOWN_SECONDS * 1000;

// Fallback in-memory map used ONLY if Redis is unreachable
const fallbackMemoryMap = new Map();

/**
 * Generate a unique session fingerprint based on login details
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {string} SHA-256 hex digest
 */
function generateLoginFingerprint(userId, ipAddress, userAgent) {
  const data = `${userId}-${ipAddress || 'unknown'}-${userAgent || 'unknown'}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check if a login notification email should be sent
 * Returns true if notification should be sent, false if recently sent within cooldown
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 * @returns {Promise<boolean>}
 */
async function shouldSendLoginNotification(userId, ipAddress, userAgent) {
  const fingerprint = generateLoginFingerprint(userId, ipAddress, userAgent);
  const redisKey = redisService.buildKey('cooldown', 'login_notif', `${userId}:${fingerprint}`);
  const now = Date.now();

  // 1. Primary Strategy: Atomic Redis SET NX EX
  try {
    const ready = isRedisReady() || (await waitForRedisReady(2000));
    if (ready) {
      const wasSet = await redisService.setIfNotExists(
        redisKey,
        now,
        NOTIFICATION_COOLDOWN_SECONDS
      );
      // If wasSet is true: key was freshly created in Redis -> should send notification
      if (wasSet === true) {
        return true;
      }
      // If wasSet is false: key already exists in Redis -> cooldown active, do NOT send
      if (wasSet === false) {
        return false;
      }
      // If wasSet is null: Redis operation failed -> fall through to in-memory fallback
    }
  } catch (error) {
    console.warn(`[LoginNotificationHelper] Redis check failed, falling back to memory: ${error.message}`);
  }

  // 2. Fallback Strategy: In-memory cooldown Map (Fail-Safe when Redis is offline)
  if (fallbackMemoryMap.has(fingerprint)) {
    const lastNotificationTime = fallbackMemoryMap.get(fingerprint);
    if (now - lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
      return false;
    }
  }

  fallbackMemoryMap.set(fingerprint, now);

  // Periodic cleanup of expired entries in fallback map to prevent memory leaks
  for (const [key, timestamp] of fallbackMemoryMap.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN_MS) {
      fallbackMemoryMap.delete(key);
    }
  }

  return true;
}

/**
 * Helper to clear fallback memory map (used in unit/regression testing)
 */
function clearFallbackMemoryMap() {
  fallbackMemoryMap.clear();
}

module.exports = {
  shouldSendLoginNotification,
  generateLoginFingerprint,
  clearFallbackMemoryMap,
  fallbackMemoryMap
};
