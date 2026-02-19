const express = require('express');
const router = express.Router();

const {forgotPassword, resetPassword, validateResetPasswordToken} = require('../controllers/passwordController');
const forgotPasswordLimiter = require('../middlewares/forgotPasswordLimiter.middleware');

router.post(
  '/forgot',
  forgotPasswordLimiter,
  forgotPassword
);

router.post(
  '/reset',
  resetPassword
);

router.get(
  '/validate/:token',
  validateResetPasswordToken
);

module.exports = router;
