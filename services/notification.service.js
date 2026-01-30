const Notification = require('../models/Notification');

/**
 * Create a notification safely
 * @param {Object} data
 * @param {ObjectId} data.userId
 * @param {String} data.title
 * @param {String} data.message
 * @param {String} [data.type]
 * @param {String} [data.priority]
 * @param {Date}   [data.expiresAt]
 */
async function createNotification(data) {
  if (!data.userId || !data.title || !data.message) {
    throw new Error('Missing required notification data');
  }

  return await Notification.create({
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    priority: data.priority || 'medium',
    expiresAt: data.expiresAt || null
  });
}

module.exports = {
  createNotification
};
