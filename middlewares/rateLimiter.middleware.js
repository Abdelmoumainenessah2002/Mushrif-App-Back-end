const redisService = require('../services/redis.service');
const { isRedisReady, waitForRedisReady } = require('../config/redis');
const { getClientIP } = require('../utils/loginHistoryHelper.utils');
const t = require('../utils/t.utils');
const messages = require('../constants/messages');

/**
 * ============================================================================
 * Centralized Redis-Based Rate Limiting Middleware (Mushrif Backend)
 * ============================================================================
 * - Atomic Fixed-Window counter using Redis Lua script (INCR + EXPIRE)
 * - Safe Fail-Open / Bounded in-memory fallback on Redis outage
 * - Standardized response headers (X-RateLimit-*, Retry-After)
 * - Standardized HTTP 429 JSON response with i18n support
 * - Endpoint-specific policies and configurable environment overrides
 */

// Bounded in-memory fallback map used ONLY if Redis is unreachable
const fallbackRateLimitMap = new Map();

/**
 * Clean expired entries from the fallback in-memory map
 * @param {number} now 
 */
function cleanupFallbackMap(now) {
  for (const [key, record] of fallbackRateLimitMap.entries()) {
    if (now > record.resetTime) {
      fallbackRateLimitMap.delete(key);
    }
  }
}

/**
 * Factory to create a specialized rate limiter middleware
 * @param {Object} options
 * @param {string} options.endpoint - Endpoint identifier (e.g. 'auth_login', 'password_forgot')
 * @param {number} [options.max=5] - Maximum allowed requests within window
 * @param {number} [options.windowSeconds=900] - Window duration in seconds (default: 15 mins)
 * @param {string} [options.messageKey] - Translation message constant key
 * @param {string} [options.message] - Default message string
 * @param {Function} [options.keyGenerator] - Custom key generator function (req) => string
 * @returns {Function} Express middleware (req, res, next)
 */
function createRateLimiter(options) {
  const {
    endpoint,
    max = 5,
    windowSeconds = 900,
    messageKey = messages.TOO_MANY_REQUESTS,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => getClientIP(req)
  } = options;

  if (!endpoint) {
    throw new Error('[RateLimiter] "endpoint" option is required for createRateLimiter');
  }

  return async function rateLimitMiddleware(req, res, next) {
    const rawIdentifier = keyGenerator(req) || 'unknown';
    const safeIdentifier = String(rawIdentifier).trim().replace(/[:\s]+/g, '_');
    const redisKey = redisService.buildKey('rl', endpoint, `ip:${safeIdentifier}`);
    const now = Date.now();

    // 1. Primary Strategy: Atomic Redis Counter via Lua
    try {
      const ready = isRedisReady() || (await waitForRedisReady(500));
      if (ready) {
        const result = await redisService.consumeRateLimit(redisKey, max, windowSeconds);
        if (result !== null) {
          // Set standard rate limit headers
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', result.remaining);
          res.setHeader('X-RateLimit-Reset', Math.floor(now / 1000) + result.ttl);

          if (result.allowed) {
            return next();
          }

          // Rate limit exceeded -> Return HTTP 429
          res.setHeader('Retry-After', result.ttl);
          const lang = req.lang || 'en';
          const translatedMsg = t(messageKey, lang);
          const finalMsg = (translatedMsg && translatedMsg !== messageKey) ? translatedMsg : message;

          return res.status(429).json({
            success: false,
            message: finalMsg,
            retryAfter: result.ttl
          });
        }
      }
    } catch (error) {
      console.warn(`[RateLimiter] Redis rate limit check failed for "${endpoint}": ${error.message}`);
    }

    // 2. Fallback Strategy: Bounded In-Memory Map (Fail-Safe when Redis is offline)
    const fallbackKey = `${endpoint}:${safeIdentifier}`;
    let record = fallbackRateLimitMap.get(fallbackKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + (windowSeconds * 1000)
      };
      fallbackRateLimitMap.set(fallbackKey, record);
    } else {
      record.count += 1;
    }

    // Periodic cleanup
    if (fallbackRateLimitMap.size > 500) {
      cleanupFallbackMap(now);
    }

    const remainingTtl = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    const remainingCount = Math.max(0, max - record.count);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remainingCount);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count <= max) {
      return next();
    }

    // Fallback limit exceeded -> Return HTTP 429
    res.setHeader('Retry-After', remainingTtl);
    const lang = req.lang || 'en';
    const translatedMsg = t(messageKey, lang);
    const finalMsg = (translatedMsg && translatedMsg !== messageKey) ? translatedMsg : message;

    return res.status(429).json({
      success: false,
      message: finalMsg,
      retryAfter: remainingTtl
    });
  };
}

/**
 * Clear the in-memory fallback map (used in automated testing)
 */
function clearFallbackRateLimitMap() {
  fallbackRateLimitMap.clear();
}

/**
 * ============================================================================
 * Pre-configured Endpoint Rate Limiters
 * ============================================================================
 */

// 1. Login: 5 attempts per 15 minutes
const loginLimiter = createRateLimiter({
  endpoint: 'auth_login',
  max: parseInt(process.env.RL_LOGIN_MAX, 10) || 5,
  windowSeconds: parseInt(process.env.RL_LOGIN_WINDOW, 10) || 15 * 60, // 15 mins
  messageKey: messages.TOO_MANY_LOGIN_ATTEMPTS,
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// 2. Registration: 5 registrations per 1 hour
const registerLimiter = createRateLimiter({
  endpoint: 'auth_register',
  max: parseInt(process.env.RL_REGISTER_MAX, 10) || 5,
  windowSeconds: parseInt(process.env.RL_REGISTER_WINDOW, 10) || 60 * 60, // 1 hour
  messageKey: messages.TOO_MANY_REGISTER_ATTEMPTS,
  message: 'Too many registration attempts from this IP, please try again after 1 hour'
});

// 3. Complete Profile: 10 attempts per 15 minutes
const completeProfileLimiter = createRateLimiter({
  endpoint: 'auth_complete_profile',
  max: parseInt(process.env.RL_COMPLETE_PROFILE_MAX, 10) || 10,
  windowSeconds: parseInt(process.env.RL_COMPLETE_PROFILE_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 4. Forgot Password: 3 requests per 15 minutes
const forgotPasswordLimiter = createRateLimiter({
  endpoint: 'password_forgot',
  max: parseInt(process.env.RL_FORGOT_PASSWORD_MAX, 10) || 3,
  windowSeconds: parseInt(process.env.RL_FORGOT_PASSWORD_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_EMAILS,
  message: 'Too many password reset requests from this IP, please try again after 15 minutes'
});

// 5. Reset Password: 5 attempts per 15 minutes
const resetPasswordLimiter = createRateLimiter({
  endpoint: 'password_reset',
  max: parseInt(process.env.RL_RESET_PASSWORD_MAX, 10) || 5,
  windowSeconds: parseInt(process.env.RL_RESET_PASSWORD_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 6. Validate Reset Token: 10 attempts per 15 minutes
const validateResetTokenLimiter = createRateLimiter({
  endpoint: 'password_validate_token',
  max: parseInt(process.env.RL_VALIDATE_RESET_TOKEN_MAX, 10) || 10,
  windowSeconds: parseInt(process.env.RL_VALIDATE_RESET_TOKEN_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 7. Verify Email Request: 3 requests per 15 minutes
const verifyEmailRequestLimiter = createRateLimiter({
  endpoint: 'email_verify_request',
  max: parseInt(process.env.RL_VERIFY_EMAIL_MAX, 10) || 3,
  windowSeconds: parseInt(process.env.RL_VERIFY_EMAIL_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 8. Validate Email Token: 10 attempts per 15 minutes
const validateEmailTokenLimiter = createRateLimiter({
  endpoint: 'email_validate_token',
  max: parseInt(process.env.RL_VALIDATE_EMAIL_TOKEN_MAX, 10) || 10,
  windowSeconds: parseInt(process.env.RL_VALIDATE_EMAIL_TOKEN_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 9. Change Email OTP Request: 3 requests per 15 minutes
const changeEmailRequestLimiter = createRateLimiter({
  endpoint: 'email_change_request',
  max: parseInt(process.env.RL_CHANGE_EMAIL_MAX, 10) || 3,
  windowSeconds: parseInt(process.env.RL_CHANGE_EMAIL_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

// 10. Validate Change Email OTP (6-digit numeric): 5 attempts per 15 minutes
const validateEmailOtpLimiter = createRateLimiter({
  endpoint: 'email_verify_otp',
  max: parseInt(process.env.RL_OTP_MAX, 10) || 5,
  windowSeconds: parseInt(process.env.RL_OTP_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_OTP_ATTEMPTS,
  message: 'Too many OTP verification attempts, please try again after 15 minutes'
});

// 11. OAuth Initiation: 20 requests per 15 minutes
const oauthLimiter = createRateLimiter({
  endpoint: 'oauth_init',
  max: parseInt(process.env.RL_OAUTH_MAX, 10) || 20,
  windowSeconds: parseInt(process.env.RL_OAUTH_WINDOW, 10) || 15 * 60,
  messageKey: messages.TOO_MANY_REQUESTS
});

module.exports = {
  createRateLimiter,
  clearFallbackRateLimitMap,
  fallbackRateLimitMap,
  loginLimiter,
  registerLimiter,
  completeProfileLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  validateResetTokenLimiter,
  verifyEmailRequestLimiter,
  validateEmailTokenLimiter,
  changeEmailRequestLimiter,
  validateEmailOtpLimiter,
  oauthLimiter
};
