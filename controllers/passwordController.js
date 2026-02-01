const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

const {User, validateEmail, validateNewPassword} = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const createVerificationToken = require('../services/verificationToken.service');
const sendEmail = require('../services/email.service');
const resetPasswordEmail = require('../emails/resetPasswordEmail.template');

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
      message: 'Email is required'});
  }

  const {error} = await validateEmail({email});
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }


  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'User not found'
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
    logoUrl: `${process.env.API_URL}/public/images/logo.png`
  });

  await sendEmail({
    to: user.email,
    subject: 'Reset your Mushrif password',
    html
  });

  res.status(200).json({
    success: true,
    message: 'reset password email sent'
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
      message: error.details[0].message
    });
  }

  const isValidTokenFormat = /^[a-zA-Z0-9]{32}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: 'Invalid token format'
    });
  }

  const verificationToken = await VerificationToken.findOne({
    token,
    type: 'RESET_PASSWORD'
  });

  if (!verificationToken) {
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) {
    res.status(400);
    throw new Error('User not found');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await VerificationToken.deleteOne({ _id: verificationToken._id });

  res.status(200).json({
    message: 'Password reset successful'
  });
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
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  res.status(200).json({ valid: true });
});



