const express = require('express');
const router = express.Router();

const {forgotPassword, resetPassword, validateResetPasswordToken, makePasswordForOAuth} = require('../controllers/passwordController');
const forgotPasswordLimiter = require('../middlewares/forgotPasswordLimiter.middleware');
const { verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');

// forgot password
router.post(
  '/forgot',
  forgotPasswordLimiter,
  forgotPassword
);

// validate reset password token
router.get(
  '/validate/:token',
  validateResetPasswordToken
);

// reset password
router.post(
  '/reset',
  resetPassword
);

// make password for oauth users
router.post(
  '/make-password/:id',
  verifyTokenAndOnlyUser,
  makePasswordForOAuth
);



module.exports = router;
