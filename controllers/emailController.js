const { User, validateUserId} = require("../models/User");
const t = require("../utils/t");
const messages = require("../constants/messages");
const createVerificationToken = require('../services/verificationToken.service');
const asyncHandler = require("express-async-handler");
const sendEmail = require("../services/email.service");
const verifyEmailTemplate = require("../emails/verifyEmail.template");
const VerificationToken = require('../models/VerificationToken');
const createOTP = require('../services/createOTP.service');
const changeEmailOtpEmail = require("../emails/ChangeEmail.template");


/**
 * @desc    Request email verification link (for users registered with email & password)
 * @method  Post
 * @route   /api/user/:id/verify-email
 * @access  Private (Only the user themselves)
 */

module.exports.verifyUserByEmailCtrl = asyncHandler(async (req, res) => {

  // check the validation of the user ID
  const { error } = validateUserId({ id: req.params.id });
  if (error) {
    return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang) 
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // if user is already verified, no need to send another email
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_VERIFIED, req.lang)
    });
  }

  // delete any existing verification tokens for this user to prevent multiple valid tokens
  await VerificationToken.deleteMany({
    userId: user._id,
    type: 'VERIFY_EMAIL'
  });

  // send verification email
  const token = await createVerificationToken(
      user._id,
      'VERIFY_EMAIL',
      1440
  );

  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;

  const html = verifyEmailTemplate({
    verificationLink,
    logoUrl: `${process.env.API_URL}/public/images/logo.png`,
    lang: req.lang
  });

  await sendEmail({
    to: user.email,
    subject: t(messages.VERIFY_EMAIL_SENT, req.lang),
    html
  });

  res.status(200).json({
    success: true,
    message: t(messages.VERIFY_EMAIL_SENT, req.lang)
  });

});

  
  /**
   * @desc Validate email verification token
   * @route /api/users/validate-email/:token
   * @method GET
   * @access Public
  */


module.exports.validateEmailVerificationTokenCtrl = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const isValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  const exists = await VerificationToken.exists({
    token,
    type: 'VERIFY_EMAIL'
  });

  if (!exists) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  res.status(200).json({
    success: true,
    message: t(messages.TOKEN_VALID, req.lang),
    valid: true
  });
});


  /**
   * @desc Verify email and update user
   * @route /api/users/verify-email
   * @method POST
   * @access Public
  */


module.exports.verifyEmailAndUpdateUserCtrl = asyncHandler(async (req, res) => {
  const { token } = req.body;


  // validate token format
  const isValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_TOKEN_FORMAT, req.lang)
    });
  }

  // find the token in the database
  const verificationToken = await VerificationToken.findOne({
    token,
    type: 'VERIFY_EMAIL'
  });

  // if token not found or expired, return error
  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  // find the user associated with the token
  const user = await User.findById(verificationToken.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // if user is already verified, no need to verify again
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_VERIFIED, req.lang)
    });
  }


  // mark user as verified and save
  user.isVerified = true;
  await user.save();


  // delete the token after successful verification
  await VerificationToken.deleteOne({ _id: verificationToken._id });


  // return success response
  res.status(200).json({
    success: true,
    message: t(messages.EMAIL_VERIFIED, req.lang)
  });
});
  


/**
 * @desc    Request to start email change process (Sends OTP to current email)
 * @method  Post
 * @route   /api/emails/:id/change-email-request
 * @access  Private (Only the user themselves)
 */
module.exports.changeEmailRequestCtrl = asyncHandler(async (req, res) => {

  // Verify ID
  const { error } = validateUserId({ id: req.params.id });
  if (error) {
    return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang) 
    });
  }

  // search for the user
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // Create the OTP
  const otpCode = await createOTP(
    user._id,
    'email',
    'CHANGE_EMAIL',
    10
  );

  

  // email template 
  const html = changeEmailOtpEmail({
    otp: otpCode,
    logoUrl: `${process.env.API_URL}/public/images/logo.png`,
    lang: req.lang
  });

  // send the email
  await sendEmail({
    to: user.email, // الإرسال للإيميل الحالي للتأكد من هوية الشخص
    subject: t(messages.OTP_SENT, req.lang),
    html
  });

  // Response
  res.status(200).json({
    success: true,
    message: t(messages.OTP_SENT, req.lang)
  });

});