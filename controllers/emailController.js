const { User, validateUserId } = require("../models/auth/User.model");
const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const createVerificationToken = require("../services/verificationToken.service");
const asyncHandler = require("express-async-handler");
const sendEmail = require("../services/email.service");
const verifyEmailTemplate = require("../emails/verifyEmail.template");
const VerificationToken = require("../models/auth/VerificationToken.model");
const { createOTP } = require("../services/createOTP.service");
const changeEmailOtpEmail = require("../emails/ChangeEmail.template");
const OTP = require("../models/auth/OTP.model");
const bcrypt = require("bcryptjs");
const {
  sendEmailChangeNotifications,
} = require("../utils/emailChangeNotificationHelper.utils");

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
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // if user is already verified, no need to send another email
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_VERIFIED, req.lang),
    });
  }

  // delete any existing verification tokens for this user to prevent multiple valid tokens
  await VerificationToken.deleteMany({
    userId: user._id,
    type: "VERIFY_EMAIL",
  });

  // send verification email
  const token = await createVerificationToken(user._id, "VERIFY_EMAIL", 1440);

  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;

  const html = verifyEmailTemplate({
    verificationLink,
    logoUrl: `${process.env.SERVER_URL}/public/images/logo.png`,
    lang: req.lang,
  });

  await sendEmail({
    to: user.email,
    subject: t(messages.VERIFY_EMAIL_SENT, req.lang),
    html,
  });

  res.status(200).json({
    success: true,
    message: t(messages.VERIFY_EMAIL_SENT, req.lang),
  });
});

/**
 * @desc Validate email verification token
 * @route /api/users/validate-email/:token
 * @method GET
 * @access Public
 */

module.exports.validateEmailVerificationTokenCtrl = asyncHandler(
  async (req, res) => {
    const { token } = req.params;

    const isValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
    if (!isValidTokenFormat) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
      });
    }

    const exists = await VerificationToken.exists({
      token,
      type: "VERIFY_EMAIL",
    });

    if (!exists) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
      });
    }

    res.status(200).json({
      success: true,
      message: t(messages.TOKEN_VALID, req.lang),
      valid: true,
    });
  },
);

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
      message: t(messages.INVALID_TOKEN_FORMAT, req.lang),
    });
  }

  // find the token in the database
  const verificationToken = await VerificationToken.findOne({
    token,
    type: "VERIFY_EMAIL",
  });

  // if token not found or expired, return error
  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // find the user associated with the token
  const user = await User.findById(verificationToken.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // if user is already verified, no need to verify again
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_VERIFIED, req.lang),
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
    message: t(messages.EMAIL_VERIFIED, req.lang),
  });
});

/**
 * @desc    Request to start email change process (Sends OTP to current email)
 * @method  Post
 * @route   /api/emails/:id/change-email-request
 * @access  Private (Only the user themselves)
 */
module.exports.changeEmailRequestCtrl = asyncHandler(async (req, res) => {
  console.log("changeEmailRequestCtrl called");

  // Verify ID
  const { error } = validateUserId({ id: req.params.id });
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // search for the user
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // check if the user has any Oauth providers associated with their account
  // if length of providers is more than 1 or primary provider is not local, then they cannot change their email,
  // more then 1 it means that officily at lease 1 Oauth provider is associated with the account, and if primary provider is not local, it means that the user registered using an Oauth provider and then added email/password later, so they cannot change their email
  if (user.primaryProvider !== "local" || user.providers.length > 1) {
    return res.status(400).json({
      success: false,
      message: t(messages.CANNOT_CHANGE_EMAIL_WITH_OAUTH, req.lang),
    });
  }

  // delete any existing OTPs for this user to prevent multiple valid OTPs
  await OTP.deleteMany({
    userId: user._id,
    type: "CHANGE_EMAIL",
    target: "email",
  });

  // Create the OTP
  const otpCode = await createOTP(user._id, "email", "CHANGE_EMAIL", 10);

  // email template
  const html = changeEmailOtpEmail({
    otp: otpCode,
    logoUrl: `${process.env.SERVER_URL}/public/images/logo.png`,
    lang: req.lang,
  });

  // send the email
  await sendEmail({
    to: user.email, // الإرسال للإيميل الحالي للتأكد من هوية الشخص
    subject: t(messages.OTP_SENT, req.lang),
    html,
  });

  // Response
  res.status(200).json({
    success: true,
    message: t(messages.OTP_SENT, req.lang),
  });
});

/**
 * @desc Validate email verification otp
 * @route /api/users/validate-email-otp
 * @method POST
 * @access Private (Only the user themselves)
 */

module.exports.validateChangeEmailOtpCtrl = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const { id: userId } = req.params;

  // validate otp format
  const isValidOtpFormat = /^\d{6}$/.test(otp);
  if (!isValidOtpFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
    });
  }

  // validate user ID
  const { error } = validateUserId({ id: userId });
  if (error) {
    console.log("Invalid user ID:", userId);
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  const otpRecord = await OTP.findOne({
    userId,
    type: "CHANGE_EMAIL",
    target: "email",
  });

  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
    });
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
    });
  }

  // return success response
  return res.status(200).json({
    success: true,
    message: t(messages.OTP_VALID, req.lang),
  });
});

/***
 * @desc    Verify email and update user email
 * @method  Patch
 * @route   /api/emails/verify-email-and-update
 * @access  Private (Only the user themselves)
 */

module.exports.verifyEmailAndUpdateUserEmailCtrl = asyncHandler(
  async (req, res) => {
    const { newEmail, otp } = req.body;
    const userId = req.params?.id || req.body?.userId;

    // validate otp format
    const isValidOtpFormat = /^\d{6}$/.test(otp);
    if (!isValidOtpFormat) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
      });
    }

    // validate user ID
    const { error: idError } = validateUserId({ id: userId });
    if (idError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    // validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_EMAIL_FORMAT, req.lang),
      });
    }

    // find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: t(messages.USER_NOT_FOUND, req.lang),
      });
    }

    // find the OTP record
    const otpRecord = await OTP.findOne({
      userId,
      type: "CHANGE_EMAIL",
      target: "email",
    });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
      });
    }

    // compare the provided OTP with the hashed OTP in the database
    const isMatch = await bcrypt.compare(otp, otpRecord.codeHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_OR_EXPIRED_OTP, req.lang),
      });
    }

    // check if the new email is already in use by another user
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: t(messages.EMAIL_ALREADY_IN_USE, req.lang),
      });
    }

    // Capture previous email address for security alert notification
    const oldEmail = user.email;

    // update the user's email and save and change isVerified to false, since the new email needs to be verified again
    user.isVerified = false;
    user.email = newEmail;
    await user.save();

    // delete the OTP record after successful email change
    await OTP.deleteOne({ _id: otpRecord._id });

    // return success response
    res.status(200).json({
      success: true,
      message: t(messages.EMAIL_UPDATED_SUCCESSFULLY, req.lang),
    });

    // Send verification email to new email address AND security alert notification to old email address
    sendEmailChangeNotifications({
      user,
      oldEmail,
      newEmail,
      req,
    }).catch((err) => {
      console.error(
        "[EmailController] Failed to dispatch email change notifications:",
        err.message,
      );
    });
  },
);
