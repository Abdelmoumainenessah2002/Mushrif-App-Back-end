const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  target: {
    type: String,
    required: true,
    enum: ['email', 'phone'],
  },

  type: {
    type: String,
    required: true,
    enum: ['CHANGE_EMAIL', 'LOGIN'],
  },

  codeHash: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });


otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);


