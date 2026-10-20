const { Queue } = require("bullmq");

/**
 * ============================================================================
 * Email Queue (Mushrif Backend)
 * ============================================================================
 * Queue responsible for storing email jobs in Redis.
 *
 * This file does NOT send emails.
 * Email delivery is handled by email.worker.js.
 */

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
};

const emailQueue = new Queue("mushrif-email", {
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

emailQueue.on("error", (error) => {
  console.error("[EmailQueue] Error:", error.message);
});

/**
 * Add an email job to the queue.
 *
 * @param {Object} data
 * @param {string} data.to
 * @param {string} data.subject
 * @param {string} data.html
 * @param {string} [jobName="send-email"]
 * @returns {Promise<import("bullmq").Job>}
 */
async function addEmailJob(data, jobName = "send-email") {
  if (!data || !data.to || !data.subject || !data.html) {
    throw new Error("[EmailQueue] to, subject and html are required");
  }

  return emailQueue.add(jobName, data);
}

module.exports = {
  emailQueue,
  addEmailJob,
};
