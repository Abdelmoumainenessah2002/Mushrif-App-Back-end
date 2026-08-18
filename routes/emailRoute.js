const express = require('express');
const router = express.Router();


const {
    verifyUserByEmailCtrl,
    validateEmailVerificationTokenCtrl,
    verifyEmailAndUpdateUserCtrl,
    changeEmailRequestCtrl,
    validateChangeEmailOtpCtrl,
  } = require('../controllers/emailController');

  const { verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');



  // verify user by email
router.post('/:id/verify-email', verifyUserByEmailCtrl);

// validate email verification token
router.get('/validate-email/:token', validateEmailVerificationTokenCtrl);

// verify email and update user
router.post('/verify-email', verifyEmailAndUpdateUserCtrl);



// change email request
// 
router.post('/:id/change-email-request', verifyTokenAndOnlyUser, changeEmailRequestCtrl);
router.get('/:id/change-email-verify-otp', verifyTokenAndOnlyUser, validateChangeEmailOtpCtrl);


module.exports = router;