const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests from this IP, please try again after 15 minutes'
  }
});

module.exports = forgotPasswordLimiter;
