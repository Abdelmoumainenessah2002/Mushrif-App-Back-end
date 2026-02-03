const Notification = require('../models/Notification');
const t = require('../utils/t');

/**
 * Create a notification safely
 * @param {Object} data
 * @param {ObjectId} data.userId
 * @param {String} data.title
 * @param {String} data.message
 * @param {String} [data.type]
 * @param {String} [data.priority]
 * @param {Date}   [data.expiresAt]
 * @param {String} [data.lang] - Language for translating title and message
 */
async function createNotification(data) {
  if (!data.userId || !data.title || !data.message) {
    throw new Error('Missing required notification data');
  }

  // Translate title and message if they are message keys and lang is provided
  let title = data.title;
  let message = data.message;
  const lang = data.lang || 'en';

  // If title and message look like message keys, translate them
  if (data.title && data.title === data.title.toUpperCase() && data.title.includes('_')) {
    title = t(data.title, lang, data.vars);
  }
  
  if (data.message && data.message === data.message.toUpperCase() && data.message.includes('_')) {
    message = t(data.message, lang, data.vars);
  }

  return await Notification.create({
    userId: data.userId,
    title: title,
    message: message,
    type: data.type || 'info',
    priority: data.priority || 'medium',
    expiresAt: data.expiresAt || null
  });
}

module.exports = {
  createNotification
};
