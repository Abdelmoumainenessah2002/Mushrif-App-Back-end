const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

const {User, validateEmail, validateNewPassword} = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const createVerificationToken = require('../services/verificationToken.service');
const sendEmail = require('../services/email.service');
const resetPasswordEmail = require('../emails/resetPasswordEmail.template');
const t = require('../utils/t');
const messages = require('../constants/messages');

/**
 * @desc Forgot password
 * @method POST
 * @route /api/password/forgot
 * @access Public
 */



module.exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({
      success : false,
      message: t(messages.EMAIL_REQUIRED, req.lang)
    });
  }

  const {error} = await validateEmail({email});
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang)
    });
  }


  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  const token = await createVerificationToken(
    user._id,
    'RESET_PASSWORD',
    15
  );

  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const html = resetPasswordEmail({
    resetLink,
    logoUrl: `${process.env.API_URL}/public/images/logo.png`,
    lang: req.lang
  });

  await sendEmail({
    to: user.email,
    subject: t(messages.RESET_EMAIL_SENT, req.lang),
    html
  });

  res.status(200).json({
    success: true,
    message: t(messages.RESET_EMAIL_SENT, req.lang)
  });
});


/**
 * @desc Reset password
 * @route /api/password/reset
 * @method POST
 * @access Public
 */
module.exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const {error} =  await validateNewPassword({password: newPassword});
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang)
    });
  }

  const isValidTokenFormat = /^[a-zA-Z0-9]{32}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_TOKEN_FORMAT, req.lang)
    });
  }

  const verificationToken = await VerificationToken.findOne({
    token,
    type: 'RESET_PASSWORD'
  });

  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) {
    return res.status(400).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await VerificationToken.deleteOne({ _id: verificationToken._id });

  res.status(200).json({
    success: true,
    message: t(messages.PASSWORD_RESET_SUCCESS, req.lang)
  });

  // 
});

/**
 * @desc Validate reset token (optional but pro)
 * @route /api/password/validate/:token
 * @method GET
 * @access Public
 */
module.exports.validateResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const exists = await VerificationToken.exists({
    token,
    type: 'RESET_PASSWORD'
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



