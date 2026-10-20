const express = require('express');
const router = express.Router();


const {
    verifyUserByEmailCtrl,
    validateEmailVerificationTokenCtrl,
    verifyEmailAndUpdateUserCtrl,
    changeEmailRequestCtrl,
    validateChangeEmailOtpCtrl,
    verifyEmailAndUpdateUserEmailCtrl
  } = require('../controllers/emailController');

const { verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');
const { 
  verifyEmailRequestLimiter, 
  validateEmailTokenLimiter, 
  changeEmailRequestLimiter, 
  validateEmailOtpLimiter 
} = require('../middlewares/rateLimiter.middleware');

// verify user by email
router.post('/:id/verify-email', verifyEmailRequestLimiter, verifyUserByEmailCtrl);

// validate email verification token
router.get('/validate-email/:token', validateEmailTokenLimiter, validateEmailVerificationTokenCtrl);

// verify email and update user
router.post('/verify-email', validateEmailTokenLimiter, verifyEmailAndUpdateUserCtrl);

// change email request
router.post('/:id/change-email-request', verifyTokenAndOnlyUser, changeEmailRequestLimiter, changeEmailRequestCtrl);
router.get('/:id/change-email-verify-otp', verifyTokenAndOnlyUser, validateEmailOtpLimiter, validateChangeEmailOtpCtrl);
router.patch(
  "/:id/change-email",
  verifyTokenAndOnlyUser,
  validateEmailOtpLimiter,
  verifyEmailAndUpdateUserEmailCtrl,
);

module.exports = router;