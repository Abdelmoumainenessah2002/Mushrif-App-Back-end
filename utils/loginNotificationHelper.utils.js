const crypto = require('crypto');

/**
 * Generate a unique session fingerprint based on login details
 * Used to prevent duplicate login notification emails
 */
function generateLoginFingerprint(userId, ipAddress, userAgent) {
  const data = `${userId}-${ipAddress}-${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * In-memory cache for recent login notifications
 * Key: fingerprint, Value: timestamp
 * Prevents sending duplicate emails within the cooldown period
 */
const recentLoginNotifications = new Map();

// Cooldown period: 1 hour (in milliseconds)
const NOTIFICATION_COOLDOWN = 60 * 60 * 1000;

/**
 * Check if we should send a login notification email
 * Returns true if notification should be sent, false if recently sent
 */
function shouldSendLoginNotification(userId, ipAddress, userAgent) {
  const fingerprint = generateLoginFingerprint(userId, ipAddress, userAgent);
  const now = Date.now();

  // Check if we recently sent a notification for this login
  if (recentLoginNotifications.has(fingerprint)) {
    const lastNotificationTime = recentLoginNotifications.get(fingerprint);
    const timeSinceLastNotification = now - lastNotificationTime;

    // If less than cooldown period, don't send
    if (timeSinceLastNotification < NOTIFICATION_COOLDOWN) {
      return false;
    }
  }

  // Update the cache with current timestamp
  recentLoginNotifications.set(fingerprint, now);

  // Clean up old entries (older than cooldown period)
  for (const [key, timestamp] of recentLoginNotifications.entries()) {
    if (now - timestamp > NOTIFICATION_COOLDOWN) {
      recentLoginNotifications.delete(key);
    }
  }

  return true;
}

module.exports = {
  shouldSendLoginNotification,
  generateLoginFingerprint
};
