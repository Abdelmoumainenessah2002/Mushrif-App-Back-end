const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Notification type
  type: {
    type: String,
    enum: ['success', 'error', 'warning', 'info'],
    required: true,
    default: 'info'
  },

  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  message: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: {
    type: Date,
    default: null
  },

  // Action URL (optional - for clickable notifications)
  actionUrl: {
    type: String,
    default: null
  },

  // Icon or image for the notification
  icon: {
    type: String,
    default: null
  },

  // Related entity (if notification is about a specific item)

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Expiration (optional - for time-sensitive notifications)
  expiresAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound Indexes for optimal query performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });

// TTL Index - Auto-delete notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// TTL Index for expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});


// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ userId, isRead: false });
};

// Pre-save hook for validation
notificationSchema.pre('save', function(next) {
  // If marking as read, set readAt
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);