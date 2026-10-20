require("dotenv").config({ quiet: true });

const { Worker } = require("bullmq");
const sendEmail = require("../services/email.service");

/**
 * ============================================================================
 * Email Worker (Mushrif Backend)
 * ============================================================================
 *
 * Consumes email jobs from BullMQ and sends emails through SMTP.
 *
 * One job = one email.
 *
 * This worker:
 * - Does not contain business-specific logic.
 * - Does not access MongoDB.
 * - Does not create notifications.
 * - Only handles email delivery.
 */

// ============================================================================
// BullMQ Connection
// ============================================================================

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,

  // Required for BullMQ Worker.
  maxRetriesPerRequest: null,
};

// ============================================================================
// Email Worker
// ============================================================================

const emailWorker = new Worker(
  "mushrif-email",

  async (job) => {
    const { to, subject, html } = job.data;

    console.log(`[EmailWorker] Processing job ${job.id} (${job.name})`);

    // Send email through SMTP.
    await sendEmail({
      to,
      subject,
      html,
    });

    console.log(`[EmailWorker] Email sent successfully for job ${job.id}`);

    return {
      success: true,
    };
  },

  {
    connection,

    // Maximum number of emails processed simultaneously.
    concurrency: 5,
  },
);

// ============================================================================
// Worker Events
// ============================================================================

emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `[EmailWorker] Job ${job?.id ?? "unknown"} failed:`,
    error.message,
  );
});

emailWorker.on("error", (error) => {
  console.error("[EmailWorker] Worker error:", error.message);
});

emailWorker.on("ready", () => {
  console.log("[EmailWorker] Worker is ready.");
});
