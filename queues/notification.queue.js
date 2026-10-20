const { Queue } = require("bullmq");

/**
 * ============================================================================
 * Notification Queue (Mushrif Backend)
 * ============================================================================
 * Queue responsible for storing in-app notification jobs in Redis.
 *
 * This file does NOT create notifications in MongoDB.
 * Notification creation is handled by notification.worker.js.
 *
 * This queue is completely independent from Organization.
 */

// Use a dedicated BullMQ connection configuration.
// We intentionally do NOT use config/redis.js here because its
// commandTimeout setting is intended for the application's Redis client,
// not for BullMQ workers/queues.
const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
};

const notificationQueue = new Queue("mushrif-notification", {
  connection,

  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },

    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },

    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 5000,
    },
  },
});

notificationQueue.on("error", (error) => {
  console.error("[NotificationQueue] Error:", error.message);
});

/**
 * Add an in-app notification job to the queue.
 *
 * Each job represents ONE notification for ONE user.
 *
 * @param {Object} data
 * @param {string|ObjectId} data.userId
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.type="info"]
 * @param {string} [data.priority="medium"]
 * @param {Date|string|null} [data.expiresAt=null]
 * @param {string} [jobName="create-notification"]
 * @returns {Promise<import("bullmq").Job>}
 */
async function addNotificationJob(data, jobName = "create-notification") {
  if (!data || !data.userId || !data.title || !data.message) {
    throw new Error(
      "[NotificationQueue] userId, title and message are required",
    );
  }

  return notificationQueue.add(jobName, data);
}

module.exports = {
  notificationQueue,
  addNotificationJob,
};
