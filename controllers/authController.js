const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const {
  User,
  validateRegisterUser,
  validateLoginUser,
  validateCompleteProfile,
  validateUserId,
} = require("../models/auth/User.model");
const {
  generateUID,
  buildBaseUsername,
} = require("../utils/generateUID.utils");
const { parseGlobalPhoneNumber } = require("../utils/phoneUtils.utils");
const {
  createLoginHistoryEntry,
} = require("../utils/loginHistoryHelper.utils");
const { createNotification } = require("../services/notification.service");
const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const {
  validateAndNormalizePhoneNumber,
} = require("../utils/phoneUtils.utils");
const sendEmail = require("../services/email.service");
const welcomeEmailTemplate = require("../emails/welcomeEmail.template");
const loginNotificationTemplate = require("../emails/loginNotification.template");
const {
  shouldSendLoginNotification,
} = require("../utils/loginNotificationHelper.utils");
const sessionService = require("../services/session.service");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenCookieOptions,
} = require("../utils/token.utils");
const { addEmailJob } = require("../queues/email.queue");
const { notifyUser } = require("../services/notifyUser.service");

/**
 * @desc    Register new user
 * @method  Post
 * @route   /api/auth/register
 * @access  Public
 */

module.exports.registerUserCtrl = asyncHandler(async (req, res) => {
  // 1. Validate request body
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth,
    gender,
    password,
  } = req.body;

  // 2. Check if email exists
  const existingUserByEmail = await User.findOne({
    email: email.toLowerCase(),
  });
  if (existingUserByEmail) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_EXISTS, req.lang),
    });
  }

  // 3. Validate + Normalize phone (UTIL)
  const { value: finalPhone, error: phoneError } =
    validateAndNormalizePhoneNumber(phoneNumber);

  if (phoneError) {
    return res.status(400).json({
      success: false,
      message: t(messages[phoneError], req.lang),
    });
  }

  // 4. Check if phone exists
  const existingUserByPhone = await User.findOne({
    "phoneNumber.fullNumber": finalPhone.fullNumber,
  });

  if (existingUserByPhone) {
    return res.status(400).json({
      success: false,
      message: t(messages.PHONE_ALREADY_EXISTS, req.lang),
    });
  }

  // 5. Hash password
  const salt = 10;
  const hashedPassword = await bcrypt.hash(password, salt);

  // 6. Create login history
  const loginEntry = await createLoginHistoryEntry(req, "local", true);

  let newUser;

  const baseUsername = buildBaseUsername(firstName, lastName);
  let usernameCounter = 0;

  // 7. Create user (handle duplicates)
  while (true) {
    try {
      const uid = generateUID(10);

      const username =
        usernameCounter === 0
          ? baseUsername
          : `${baseUsername}.${usernameCounter}`;

      newUser = new User({
        username,
        uid,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phoneNumber: finalPhone, // ✅ ALWAYS normalized
        dateOfBirth,
        gender,
        password: hashedPassword,
        primaryProvider: "local",
        providers: [
          {
            provider: "local",
            providerId: uid,
            email: email.toLowerCase(),
            createdAt: new Date(),
          },
        ],
        loginHistory: [loginEntry],
        lastLoginIP: loginEntry.ipAddress,
        lastLoginTime: loginEntry.loginTime,
      });

      await newUser.save();
      break;
    } catch (err) {
      const isDuplicate =
        err.code === 11000 ||
        err.name === "MongoServerError" ||
        err.name === "MongooseError";

      if (isDuplicate) {
        if (err.message.includes("uid")) continue;
        if (err.message.includes("username")) {
          usernameCounter++;
          continue;
        }
      }

      throw err;
    }
  }

  // 8. Welcome notification and email
  if (!newUser.hasWelcomeNotification) {
    await notifyUser({
      userIds: [newUser._id],

      preferences: {
        email: true,
        inApp: true,
      },

      email: {
        subject: t(messages.WELCOME_TITLE, req.lang),

        html: welcomeEmailTemplate({
          firstName: newUser.firstName,
          logoUrl: `${process.env.SERVER_URL}/public/images/logo.png`,
          lang: req.lang,
        }),
      },

      notification: {
        title: messages.WELCOME_TITLE,
        message: messages.WELCOME_MESSAGE,
        type: "success",
        priority: "medium",

        vars: {
          firstName: newUser.firstName,
        },
      },
    });

    newUser.hasWelcomeNotification = true;
    await newUser.save();
  }

  // 9. Create Redis session & generate tokens
  let sessionId;
  try {
    sessionId = await sessionService.createSession(newUser._id.toString());
  } catch (sessionError) {
    console.error(
      "[AuthController] Session creation failed during registration:",
      sessionError,
    );
    return res.status(500).json({
      success: false,
      message: t(messages.SESSION_INIT_FAILED_LOGIN, req.lang),
    });
  }

  const accessToken = generateAccessToken(newUser, sessionId);
  const refreshToken = generateRefreshToken(newUser, sessionId);

  // Set HttpOnly Cookie for Refresh Token
  res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

  // 10. Safe response
  const userResponse = {
    _id: newUser._id,
    username: newUser.username,
    uid: newUser.uid,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    email: newUser.email,
    phoneNumber: newUser.phoneNumber,
    dateOfBirth: newUser.dateOfBirth,
    gender: newUser.gender,
    isAdmin: newUser.isAdmin,
    isVerified: newUser.isVerified,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };

  return res.status(201).json({
    success: true,
    message: t(messages.USER_REGISTERED, req.lang),
    data: {
      user: userResponse,
      accessToken,
      token: accessToken,
    },
  });
});

/**
 * @desc    Complete profile for OAuth users
 * @method  Post
 * @route   /api/auth/complete-profile/:id
 * @access  Public
 */

module.exports.completeProfileCtrl = asyncHandler(async (req, res) => {
  // Validate user ID parameter
  const { error: idError } = validateUserId(req.params);
  if (idError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // Validate request body
  const { error } = validateCompleteProfile(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const { phoneNumber, dateOfBirth, gender } = req.body;
  const userId = req.params.id;

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // Check if user is an OAuth user
  if (user.primaryProvider === "local") {
    return res.status(400).json({
      success: false,
      message: t(messages.NOT_OAUTH_USER, req.lang),
    });
  }

  // Check if profile is already completed
  if (user.phoneNumber && user.dateOfBirth && user.gender) {
    return res.status(400).json({
      success: false,
      message: t(messages.PROFILE_ALREADY_COMPLETED, req.lang),
    });
  }

  // 🔥 نفس logic تاع register (validate + normalize)
  const { value: finalPhone, error: phoneError } =
    validateAndNormalizePhoneNumber(phoneNumber);

  if (phoneError) {
    return res.status(400).json({
      success: false,
      message: t(messages[phoneError], req.lang),
    });
  }

  // Check if phone number already exists for another user
  const existingUserByPhone = await User.findOne({
    "phoneNumber.fullNumber": finalPhone.fullNumber,
  });

  if (existingUserByPhone && existingUserByPhone._id.toString() !== userId) {
    return res.status(400).json({
      success: false,
      message: t(messages.PHONE_ALREADY_EXISTS, req.lang),
    });
  }

  // Validate age (must be at least 13 years old)
  const today = new Date();
  const minAge = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate(),
  );

  if (new Date(dateOfBirth) > minAge) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_AGE, req.lang),
    });
  }

  // ✅ استعمل النسخة النظيفة فقط
  user.phoneNumber = finalPhone;
  user.dateOfBirth = new Date(dateOfBirth);
  user.gender = gender;

  // Save updated user
  await user.save();

  // Response
  const userResponse = {
    _id: user._id,
    username: user.username,
    uid: user.uid,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
  };

  return res.status(200).json({
    success: true,
    message: t(messages.PROFILE_COMPLETED, req.lang),
    data: {
      user: userResponse,
    },
  });
});

/**
 * @desc    Login user
 * @method  Post
 * @route   /api/auth/login
 * @access  Public
 */
module.exports.loginUserCtrl = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = validateLoginUser(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_CREDENTIALS, req.lang),
    });
  }

  // Check if user account is suspended or deleted
  if (!user.isActive || user.isDeleted) {
    return res.status(403).json({
      success: false,
      message: t(messages.ACCOUNT_SUSPENDED, req.lang),
    });
  }

  // Check if password matches and there is a local provider
  const hasLocalProvider = user.providers.some((p) => p.provider === "local");
  if (!hasLocalProvider) {
    return res.status(400).json({
      success: false,
      message: t(messages.NO_LOCAL_ACCOUNT, req.lang),
    });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_CREDENTIALS, req.lang),
    });
  }

  // Create login history entry
  const loginEntry = await createLoginHistoryEntry(req, "local", true);

  // Add login history to user
  if (!user.loginHistory) {
    user.loginHistory = [];
  }
  user.loginHistory.push(loginEntry);
  user.lastLoginIP = loginEntry.ipAddress;
  user.lastLoginTime = loginEntry.loginTime;

  // Save user with login history
  await user.save();

  // Send login notification email (with duplicate prevention)
  if (
    await shouldSendLoginNotification(
      user._id.toString(),
      loginEntry.ipAddress,
      req.headers["user-agent"],
    )
  ) {
    try {
      const html = loginNotificationTemplate({
        firstName: user.firstName,
        loginTime: loginEntry.loginTime,
        ipAddress: loginEntry.ipAddress,
        location: loginEntry.location,
        browser: loginEntry.browser,
        device: loginEntry.device,
        os: loginEntry.os,
        logoUrl: `${process.env.SERVER_URL}/public/images/logo.png`,
        lang: req.lang,
      });

      await notifyUser({
        userIds: [user._id],

        preferences: {
          email: true,
          inApp: true,
        },

        email: {
          subject: t(messages.LOGIN_NOTIFICATION_SUBJECT, req.lang),
          html,
        },

        notification: {
          title: messages.LOGIN_NOTIFICATION_TITLE,
          message: messages.LOGIN_NOTIFICATION_MESSAGE,
          type: "info",
          priority: "medium",
        },
      });
    } catch (emailQueueError) {
      console.error(
        "[AuthController] Failed to queue login notification email:",
        emailQueueError.message,
      );
    }
  }

  // 1. Create Redis session
  let sessionId;
  try {
    sessionId = await sessionService.createSession(user._id.toString());
  } catch (sessionError) {
    console.error("[AuthController] Session creation failed:", sessionError);
    return res.status(500).json({
      success: false,
      message: t(messages.SESSION_INIT_FAILED, req.lang),
    });
  }

  // 2. Generate Access Token (15m) & Refresh Token (30d)
  const accessToken = generateAccessToken(user, sessionId);
  const refreshToken = generateRefreshToken(user, sessionId);

  // 3. Set HttpOnly Cookie for Refresh Token
  res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

  // 4. Return Access Token in JSON response
  res.status(200).json({
    success: true,
    message: t(messages.LOGIN_SUCCESS, req.lang),
    data: {
      accessToken,
      token: accessToken, // Backward compatibility alias
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
});

/**
 * @desc    Refresh Access Token using HttpOnly Refresh Token Cookie
 * @method  POST
 * @route   /api/auth/refresh
 * @access  Public (Requires valid refresh cookie)
 */
module.exports.refreshTokenCtrl = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: t(messages.NO_TOKEN_PROVIDED, req.lang),
    });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (tokenErr) {
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  if (!decoded || !decoded.id || !decoded.sessionId) {
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // Validate Redis session
  const sessionValidation = await sessionService.validateSession(
    decoded.sessionId,
    decoded.id,
  );

  if (sessionValidation.error) {
    // Redis infrastructure failure: do NOT fail open
    return res.status(503).json({
      success: false,
      message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang),
    });
  }

  if (!sessionValidation.valid) {
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(401).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang),
    });
  }

  // Verify user still exists and is active
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive || user.isDeleted) {
    await sessionService.deleteSession(decoded.id, decoded.sessionId);
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res
      .status(user && (!user.isActive || user.isDeleted) ? 403 : 401)
      .json({
        success: false,
        message: t(
          user && (!user.isActive || user.isDeleted)
            ? messages.ACCOUNT_SUSPENDED
            : messages.USER_NOT_FOUND,
          req.lang,
        ),
      });
  }

  // Issue new Access Token (same sessionId)
  const newAccessToken = generateAccessToken(user, decoded.sessionId);

  return res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken,
    },
  });
});

/**
 * @desc    Logout user from current device (Revokes current session and clears cookie)
 * @method  POST
 * @route   /api/auth/logout
 * @access  Private / Public
 */
module.exports.logoutUserCtrl = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.user?.sessionId;

  let targetSessionId = sessionId;
  let targetUserId = userId;

  if (!targetSessionId && req.cookies?.refreshToken) {
    try {
      const decoded = verifyRefreshToken(req.cookies.refreshToken);
      targetSessionId = decoded.sessionId;
      targetUserId = targetUserId || decoded.id;
    } catch (err) {
      // If refresh token is invalid or expired, client cookie will still be cleared below
    }
  }

  // Always clear client-side cookie
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  if (targetUserId && targetSessionId) {
    const sessionResult = await sessionService.deleteSession(
      targetUserId,
      targetSessionId,
    );
    if (sessionResult.error) {
      return res.status(503).json({
        success: false,
        message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang),
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: t(messages.LOGOUT_SUCCESS, req.lang),
  });
});

/**
 * @desc    Logout user from ALL devices (Revokes all sessions in Redis and clears cookie)
 * @method  POST
 * @route   /api/auth/logout-all
 * @access  Private
 */
module.exports.logoutAllDevicesCtrl = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  // Always clear client-side cookie
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

  if (userId) {
    const sessionResult = await sessionService.deleteAllUserSessions(userId);
    if (sessionResult.error) {
      return res.status(503).json({
        success: false,
        message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang),
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: t(messages.LOGOUT_ALL_DEVICES_SUCCESS, req.lang),
  });
});
