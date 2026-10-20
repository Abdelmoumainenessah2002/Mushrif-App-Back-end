require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const { Worker } = require("bullmq");
const { createNotification } = require("../services/notification.service");

/**
 * ============================================================================
 * Notification Worker (Mushrif Backend)
 * ============================================================================
 *
 * Consumes in-app notification jobs from BullMQ and creates notifications
 * in MongoDB.
 *
 * One job = one notification for one user.
 *
 * This worker:
 * - Has no dependency on Organization.
 * - Does not send emails.
 * - Does not contain business-specific logic.
 */

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,

  // Required for BullMQ Worker.
  maxRetriesPerRequest: null,
};

const notificationWorker = new Worker(
  "mushrif-notification",

  async (job) => {
    const { userId, title, message, type, priority, expiresAt, vars } =
      job.data;

    console.log(`[NotificationWorker] Processing job ${job.id} (${job.name})`);

    await createNotification({
      userId,
      title,
      message,
      type,
      priority,
      expiresAt,
      vars,
    });

    console.log(
      `[NotificationWorker] Notification created successfully for user ${userId}`,
    );

    return {
      success: true,
    };
  },

  {
    connection,
    concurrency: 10,
  },
);

/**
 * ============================================================================
 * Worker Events
 * ============================================================================
 */

notificationWorker.on("completed", (job) => {
  console.log(`[NotificationWorker] Job ${job.id} completed successfully`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(
    `[NotificationWorker] Job ${job?.id ?? "unknown"} failed:`,
    error.message,
  );
});

notificationWorker.on("error", (error) => {
  console.error("[NotificationWorker] Worker error:", error.message);
});

notificationWorker.on("ready", () => {
  console.log("[NotificationWorker] Worker is ready.");
});

/**
 * ============================================================================
 * MongoDB Connection
 * ============================================================================
 */

async function startNotificationWorker() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("[NotificationWorker] MongoDB connected.");
  } catch (error) {
    console.error(
      "[NotificationWorker] MongoDB connection failed:",
      error.message,
    );

    process.exit(1);
  }
}

startNotificationWorker();
