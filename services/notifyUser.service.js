const { User } = require("../models/auth/User.model");
const { addEmailJob } = require("../queues/email.queue");
const { addNotificationJob } = require("../queues/notification.queue");

/**
 * ============================================================================
 * Notify User Service (Mushrif Backend)
 * ============================================================================
 *
 * Generic background notification dispatcher.
 *
 * Supports:
 * - One or multiple users.
 * - Email notifications.
 * - In-app notifications.
 *
 * This service has NO dependency on Organization.
 */

/**
 * @param {Object} data
 * @param {Array<string|ObjectId>} data.userIds
 *
 * @param {Object} data.preferences
 * @param {boolean} data.preferences.email
 * @param {boolean} data.preferences.inApp
 *
 * @param {Object} [data.email]
 * @param {string} data.email.subject
 * @param {string} data.email.html
 *
 * @param {Object} [data.notification]
 * @param {string} data.notification.title
 * @param {string} data.notification.message
 * @param {string} [data.notification.type]
 * @param {string} [data.notification.priority]
 * @param {Date|string|null} [data.notification.expiresAt]
 * @param {string} [data.notification.lang]
 * @param {Object} [data.notification.vars]
 */
async function notifyUser({ userIds, preferences, email, notification }) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("[NotifyUser] userIds must be a non-empty array");
  }

  if (!preferences || typeof preferences !== "object") {
    throw new Error("[NotifyUser] preferences are required");
  }

  const shouldSendEmail = preferences.email === true;
  const shouldSendInApp = preferences.inApp === true;

  // Nothing enabled.
  if (!shouldSendEmail && !shouldSendInApp) {
    return {
      success: true,
      users: 0,
      emailJobs: 0,
      notificationJobs: 0,
    };
  }

  // Validate email payload only when email is enabled.
  if (shouldSendEmail) {
    if (!email?.subject || !email?.html) {
      throw new Error(
        "[NotifyUser] email.subject and email.html are required when email is enabled",
      );
    }
  }

  // Validate in-app payload only when inApp is enabled.
  if (shouldSendInApp) {
    if (!notification?.title || !notification?.message) {
      throw new Error(
        "[NotifyUser] notification.title and notification.message are required when inApp is enabled",
      );
    }
  }

  // Remove duplicate IDs.
  const uniqueUserIds = [
    ...new Map(userIds.map((userId) => [userId.toString(), userId])).values(),
  ];

  // ==========================================================================
  // Resolve users in ONE database query.
  // ==========================================================================
  //
  // Only email is needed from User.
  // In-app notifications use the supplied userId directly.
  // ==========================================================================

  let usersById = new Map();

  if (shouldSendEmail) {
    const users = await User.find({
      _id: { $in: uniqueUserIds },
    })
      .select("_id email")
      .lean();

    usersById = new Map(users.map((user) => [user._id.toString(), user]));
  }

  // ==========================================================================
  // Create background jobs.
  // ==========================================================================

  const jobs = [];

  for (const userId of uniqueUserIds) {
    const userKey = userId.toString();

    // ------------------------------------------------------------------------
    // Email
    // ------------------------------------------------------------------------

    if (shouldSendEmail) {
      const user = usersById.get(userKey);

      // User does not exist or has no email.
      // Skip email for this user instead of creating an invalid job.
      if (user?.email) {
        jobs.push(
          addEmailJob(
            {
              to: user.email,
              subject: email.subject,
              html: email.html,
            },
            "user-notification-email",
          ),
        );
      }
    }

    // ------------------------------------------------------------------------
    // In-App Notification
    // ------------------------------------------------------------------------

    if (shouldSendInApp) {
      jobs.push(
        addNotificationJob(
          {
            userId,
            title: notification.title,
            message: notification.message,
            type: notification.type || "info",
            priority: notification.priority || "medium",
            expiresAt: notification.expiresAt || null,
            vars: notification.vars || {},
          },
          "user-notification",
        ),
      );
    }
  }

  // ==========================================================================
  // Wait only until jobs are stored in Redis.
  // ==========================================================================
  //
  // We do NOT wait for:
  // - SMTP
  // - MongoDB notification creation
  //
  // Those happen inside workers.
  // ==========================================================================

  await Promise.all(jobs);

  return {
    success: true,
    users: uniqueUserIds.length,
    emailJobs: shouldSendEmail
      ? uniqueUserIds.filter((userId) => usersById.has(userId.toString()))
          .length
      : 0,
    notificationJobs: shouldSendInApp ? uniqueUserIds.length : 0,
  };
}

module.exports = {
  notifyUser,
};
