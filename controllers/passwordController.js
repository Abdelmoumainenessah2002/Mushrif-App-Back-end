const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");

const {
  User,
  validateEmail,
  validateNewPassword,
  validateUserId,
} = require("../models/auth/User.model");
const VerificationToken = require("../models/auth/VerificationToken.model");
const createVerificationToken = require("../services/verificationToken.service");
const sendEmail = require("../services/email.service");
const resetPasswordEmail = require("../emails/resetPasswordEmail.template");
const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const sessionService = require("../services/session.service");
const { getRefreshTokenCookieOptions } = require("../utils/token.utils");
const passwordChangedEmailTemplate = require("../emails/passwordChangedEmail.template");
const passwordCreatedEmailTemplate = require("../emails/passwordCreatedEmail.template");
const { notifyUser } = require("../services/notifyUser.service");
const welcomeEmailTemplate = require("../emails/welcomeEmail.template");
const {
  getClientIP,
  parseUserAgent,
  getLocationFromIP,
} = require("../utils/loginHistoryHelper.utils");
/**
 * @desc Forgot password
 * @method POST
 * @route /api/password/forgot
 * @access Public
 */

module.exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body?.email;

  // validate email
  const { error } = validateEmail({ email });
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // check if user registered with oauth only
  const hasLocalProvider = user.providers.some((p) => p.provider === "local");
  if (!hasLocalProvider) {
    return res.status(400).json({
      success: false,
      message: t(messages.NO_LOCAL_ACCOUNT, req.lang),
    });
  }

  // generate verification token with 10 minutes expiry
  const verificationToken = await createVerificationToken(
    user._id,
    "RESET_PASSWORD",
    10,
  );

  // generate reset password link
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${verificationToken}`;

  // send reset password email
  const html = resetPasswordEmail({
    firstName: user.firstName,
    resetLink,
    lang: req.lang,
  });

  await sendEmail({
    to: user.email,
    subject: t(messages.RESET_PASSWORD_TITLE, req.lang),
    html,
  });

  res.status(200).json({
    success: true,
    message: t(messages.RESET_PASSWORD_SENT, req.lang),
  });
});

//-----------------------------------------------------------------------------------------------

/**
 * @desc Validate reset password token
 * @route /api/password/validate/:token
 * @method GET
 * @access Public
 */
module.exports.validateResetPasswordToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // validate token format (64 hex characters)
  const isValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_TOKEN_FORMAT, req.lang),
    });
  }

  const verificationToken = await VerificationToken.findOne({
    token,
    type: "RESET_PASSWORD",
  });

  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  res.status(200).json({
    success: true,
    message: t(messages.TOKEN_IS_VALID, req.lang),
  });
});

//-----------------------------------------------------------------------------------------------

/**
 * @desc Reset password
 * @route /api/password/reset
 * @method POST
 * @access Public
 */
module.exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const { error } = await validateNewPassword({ password: newPassword });
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const isValidTokenFormat = /^[a-f0-9]{64}$/.test(token);
  if (!isValidTokenFormat) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_TOKEN_FORMAT, req.lang),
    });
  }

  const verificationToken = await VerificationToken.findOne({
    token,
    type: "RESET_PASSWORD",
  });

  if (!verificationToken) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) {
    return res.status(400).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await VerificationToken.deleteOne({ _id: verificationToken._id });

  // Revoke all active sessions on password reset
  const revokeResult = await sessionService.deleteAllUserSessions(
    user._id.toString(),
  );

  // Always clear refresh token cookie regardless of Redis revocation outcome
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  if (revokeResult?.error) {
    console.warn(
      `[PasswordController] Warning: Redis session revocation failed during password reset for user ${user._id}:`,
      revokeResult.message,
    );
    return res.status(503).json({
      success: false,
      message: t(messages.SESSION_REVOCATION_FAILED_RESET, req.lang),
    });
  }

  (async () => {
    try {
      const ipAddress = getClientIP(req);

      const userAgent = req?.headers ? req.headers["user-agent"] || "" : "";

      const { browser, device, os } = parseUserAgent(userAgent);

      const location = await getLocationFromIP(ipAddress);

      const logoUrl = `${
        process.env.SERVER_URL || "http://localhost:8000"
      }/public/images/logo.png`;

      const emailHtml = passwordChangedEmailTemplate({
        firstName: user.firstName,
        changeTime: new Date(),
        ipAddress,
        location,
        browser,
        device,
        os,
        logoUrl,
        lang: req.lang,
      });

      await notifyUser({
        userIds: [user._id],

        preferences: {
          email: true,
          inApp: true,
        },

        email: {
          subject: t(messages.PASSWORD_CHANGED_TITLE, req.lang),
          html: emailHtml,
        },

        notification: {
          title: messages.PASSWORD_CHANGED_TITLE,
          message: messages.PASSWORD_CHANGED_MESSAGE,
          type: "success",
          priority: "high",
        },
      });

      console.log(
        `[PasswordController] Password change notifications dispatched for user ${user._id}`,
      );
    } catch (notificationError) {
      console.error(
        `[PasswordController] Failed to dispatch password change notifications for user ${user._id}:`,
        notificationError.message,
      );
    }
  })();

  res.status(200).json({
    success: true,
    message: t(messages.PASSWORD_RESET_SUCCESS, req.lang),
  });
});

//-----------------------------------------------------------------------------------------------

/**
 * @desc make passwords for oauth users
 * @route /api/password/make-password/:id
 * @method POST
 * @access Private (only for oauth users)
 */

module.exports.makePasswordForOAuth = asyncHandler(async (req, res) => {
  // Validate user ID parameter
  const { error: idError } = validateUserId(req.params);
  if (idError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // Verify that authenticated user cannot create/modify password for another user account
  if (req.user?.id && req.user.id.toString() !== req.params.id.toString()) {
    return res.status(403).json({
      success: false,
      message: t(messages.NOT_AUTHORIZED, req.lang),
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // check if the user already has a local password / local provider
  const hasLocal =
    user.providers?.some((p) => p.provider === "local") ||
    user.primaryProvider === "local" ||
    user.authMethods?.includes("local") ||
    !!user.password;
  if (hasLocal) {
    return res.status(400).json({
      success: false,
      message: t(messages.PASSWORD_RESET_NOT_AVAILABLE, req.lang),
    });
  }

  const password = req.body.password;
  const { error: passwordError } = await validateNewPassword({
    password: password,
  });
  if (passwordError) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;

  // Add 'local' to authMethods if not already present
  if (!user.authMethods) {
    user.authMethods = [];
  }
  if (!user.authMethods.includes("local")) {
    user.authMethods.push("local");
  }

  // Add 'local' provider to providers array while strictly preserving existing OAuth providers
  const hasLocalInProviders = user.providers?.some(
    (p) => p.provider === "local",
  );
  if (!hasLocalInProviders) {
    user.providers.push({
      provider: "local",
      providerId: user._id.toString(),
      email: user.email,
      createdAt: new Date(),
    });
  }

  await user.save();

  // Revoke all active sessions on password creation
  const revokeResult = await sessionService.deleteAllUserSessions(
    user._id.toString(),
  );

  // Always clear refresh token cookie regardless of Redis revocation outcome
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  if (revokeResult?.error) {
    console.warn(
      `[PasswordController] Warning: Redis session revocation failed during makePassword for user ${user._id}:`,
      revokeResult.message,
    );
    return res.status(503).json({
      success: false,
      message: t(messages.SESSION_REVOCATION_FAILED_PASSWORD_CREATE, req.lang),
    });
  }

  (async () => {
    try {
      const ipAddress = getClientIP(req);

      const userAgent = req?.headers ? req.headers["user-agent"] || "" : "";

      const { browser, device, os } = parseUserAgent(userAgent);

      const location = await getLocationFromIP(ipAddress);

      const logoUrl = `${
        process.env.SERVER_URL || "http://localhost:8000"
      }/public/images/logo.png`;

      const emailHtml = passwordCreatedEmailTemplate({
        firstName: user.firstName,
        createTime: new Date(),
        ipAddress,
        location,
        browser,
        device,
        os,
        logoUrl,
        lang: req.lang,
      });

      await notifyUser({
        userIds: [user._id],

        preferences: {
          email: true,
          inApp: true,
        },

        email: {
          subject: t(messages.PASSWORD_CREATED_TITLE, req.lang),
          html: emailHtml,
        },

        notification: {
          title: messages.PASSWORD_CREATED_TITLE,
          message: messages.PASSWORD_CREATED_MESSAGE,
          type: "success",
          priority: "high",
        },
      });

      console.log(
        `[PasswordController] Password creation notifications dispatched for user ${user._id}`,
      );
    } catch (notificationError) {
      console.error(
        `[PasswordController] Failed to dispatch password creation notifications for user ${user._id}:`,
        notificationError.message,
      );
    }
  })();

  res.status(200).json({
    success: true,
    message: t(messages.PASSWORD_RESET_SUCCESS, req.lang),
  });
});
