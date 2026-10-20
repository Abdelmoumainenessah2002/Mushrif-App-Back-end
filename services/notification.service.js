const Notification = require("../models/Notification");

/**
 * Create a notification
 *
 * title/message = translation keys
 * vars = dynamic values used by translations
 *
 * Language is NOT stored.
 */
async function createNotification(data) {
  if (!data.userId || !data.title || !data.message) {
    throw new Error("Missing required notification data");
  }

  return await Notification.create({
    userId: data.userId,
    title: data.title,
    message: data.message,
    vars: data.vars || {},
    type: data.type || "info",
    priority: data.priority || "medium",
    expiresAt: data.expiresAt || null,
  });
}

module.exports = {
  createNotification,
};
