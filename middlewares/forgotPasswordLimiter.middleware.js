const rateLimit = require('express-rate-limit');
const t = require('../utils/t.utils');
const messages = require('../constants/messages');

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.lang || 'en';
    res.status(429).json({
      success: false,
      message: t(messages.TOO_MANY_EMAILS, lang)
    });
  }
});

module.exports = forgotPasswordLimiter;
