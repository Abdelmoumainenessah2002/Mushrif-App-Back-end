const express = require('express');
const router = express.Router();

const {forgotPassword, resetPassword} = require('../controllers/passwordController');
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

module.exports = router;
