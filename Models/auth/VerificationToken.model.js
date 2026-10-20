const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  token: {
    type: String,
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['RESET_PASSWORD', 'VERIFY_EMAIL'],
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// Auto delete after expiration
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
