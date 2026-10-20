const Redis = require('ioredis');
require("dotenv").config({ quiet: true });

/**
 * ============================================================================
 * Centralized Redis Connection Manager (Mushrif Backend)
 * ============================================================================
 * - Singleton ioredis client architecture
 * - Exponential backoff retry strategy
 * - Comprehensive event logging and connection state tracking
 * - Graceful degradation support (fail-open / fail-safe)
 * - Safe shutdown lifecycle hooks
 */

let redisClient = null;
let isConnected = false;
let isReady = false;
let readyPromise = null;

/**
 * Builds Redis connection options from environment variables
 * @returns {Object} ioredis configuration options
 */
function getRedisConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const useTls = process.env.REDIS_TLS === 'true';

  const baseConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    
    // Connection and Command Timeouts
    connectTimeout: 10000,          // 10s connection timeout
    commandTimeout: 3000,           // 3s command timeout (avoids hanging requests)
    enableReadyCheck: true,
    enableOfflineQueue: true,       // Buffer commands during brief reconnection spikes
    maxRetriesPerRequest: 3,        // Fail fast after 3 retries on broken connection
    
    // Exponential Backoff Reconnection Strategy
    retryStrategy(times) {
      const maxRetryDelay = 3000;
      const delay = Math.min(times * 100, maxRetryDelay);
      console.warn(`[Redis] Connection lost. Attempting reconnect #${times} in ${delay}ms...`);
      return delay;
    },
    
    // Reconnect on specific connection errors
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      if (targetErrors.some(errMsg => err.message.includes(errMsg))) {
        console.warn(`[Redis] Reconnecting due to error: ${err.message}`);
        return true;
      }
      return false;
    }
  };

  // Optional TLS configuration (for AWS ElastiCache / Redis Cloud / Upstash)
  if (useTls) {
    baseConfig.tls = {
      rejectUnauthorized: isProduction
    };
  }

  return baseConfig;
}

/**
 * Initializes and returns the singleton Redis client instance
 * @returns {Redis} ioredis client
 */
function initRedis() {
  if (redisClient) {
    return redisClient;
  }

  const config = getRedisConfig();
  
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      ...config,
      lazyConnect: false
    });
  } else {
    redisClient = new Redis(config);
  }

  // Event Listeners
  redisClient.on('connect', () => {
    isConnected = true;
    console.log(`[Redis] Connecting to Redis server at ${config.host}:${config.port}...`);
  });

  redisClient.on('ready', () => {
    isConnected = true;
    isReady = true;
    console.log('[Redis] Connection established and ready to accept commands.');
  });

  redisClient.on('error', (err) => {
    isReady = false;
    // Log error without throwing unhandled exceptions
    console.error(`[Redis] Connection Error: ${err.message}`);
  });

  redisClient.on('close', () => {
    isConnected = false;
    isReady = false;
    console.warn('[Redis] Connection closed.');
  });

  redisClient.on('reconnecting', (delay) => {
    isConnected = false;
    isReady = false;
    console.log(`[Redis] Reconnecting in ${delay}ms...`);
  });

  redisClient.on('end', () => {
    isConnected = false;
    isReady = false;
    console.warn('[Redis] Connection ended.');
  });

  return redisClient;
}

/**
 * Returns the active Redis client singleton (initializing if not already done)
 * @returns {Redis}
 */
function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Asynchronously waits for Redis client to become ready, up to a timeout.
 * Initializes the client if not already started.
 * Shares a single pending promise across concurrent callers to prevent duplicate listeners.
 * @param {number} [timeoutMs=2000] - Max wait time in milliseconds
 * @returns {Promise<boolean>} Resolves to true if ready, false if timed out or failed
 */
async function waitForRedisReady(timeoutMs = 2000) {
  if (isRedisReady()) {
    return true;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  if (client.status === 'ready') {
    isConnected = true;
    isReady = true;
    return true;
  }

  if (readyPromise) {
    return readyPromise;
  }

  readyPromise = new Promise((resolve) => {
    let timer = null;
    let settled = false;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      readyPromise = null;
      client.removeListener('ready', onReady);
      client.removeListener('error', onError);
      client.removeListener('close', onClose);
      client.removeListener('end', onEnd);
    };

    const onReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };

    const onError = () => {
      if (settled) return;
      if (client.status === 'end') {
        settled = true;
        cleanup();
        resolve(false);
      }
    };

    const onClose = () => {
      if (settled) return;
      if (client.status === 'end') {
        settled = true;
        cleanup();
        resolve(false);
      }
    };

    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(isRedisReady());
    }, timeoutMs);

    client.once('ready', onReady);
    client.on('error', onError);
    client.on('close', onClose);
    client.once('end', onEnd);
  });

  return readyPromise;
}

/**
 * Checks if Redis is currently connected and ready
 * @returns {boolean}
 */
function isRedisReady() {
  return Boolean(isConnected && isReady && redisClient && redisClient.status === 'ready');
}

/**
 * Performs a health check / PING on the Redis instance
 * @returns {Promise<{ status: string, latencyMs?: number, error?: string }>}
 */
async function pingRedis() {
  if (!isRedisReady()) {
    return {
      status: 'unhealthy',
      error: 'Redis client is not ready (disconnected or connecting)'
    };
  }

  const startTime = Date.now();
  try {
    const response = await redisClient.ping();
    const latencyMs = Date.now() - startTime;
    return {
      status: response === 'PONG' ? 'healthy' : 'degraded',
      latencyMs,
      response
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Helper to create isolated Redis connections for BullMQ / connect-redis
 * @param {Object} [overrideOptions]
 * @returns {Redis}
 */
function createCustomClient(overrideOptions = {}) {
  const baseConfig = getRedisConfig();
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      ...baseConfig,
      ...overrideOptions
    });
  }
  return new Redis({
    ...baseConfig,
    ...overrideOptions
  });
}

/**
 * Gracefully shuts down the Redis connection
 */
async function closeRedis() {
  readyPromise = null;
  if (redisClient) {
    try {
      console.log('[Redis] Closing Redis connection gracefully...');
      await redisClient.quit();
      console.log('[Redis] Connection closed successfully.');
    } catch (err) {
      console.error('[Redis] Error during shutdown, forcing disconnect:', err.message);
      redisClient.disconnect();
    } finally {
      redisClient = null;
      isConnected = false;
      isReady = false;
      readyPromise = null;
    }
  }
}

// Clean shutdown hook on SIGINT / SIGTERM
process.on('SIGINT', async () => {
  await closeRedis();
});

process.on('SIGTERM', async () => {
  await closeRedis();
});

module.exports = {
  initRedis,
  getRedisClient,
  isRedisReady,
  waitForRedisReady,
  pingRedis,
  createCustomClient,
  closeRedis
};
