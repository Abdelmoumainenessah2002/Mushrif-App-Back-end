const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { 
  User, 
  validateRegisterUser, 
  validateLoginUser,
  validateCompleteProfile,
  validateUserId 
} = require("../models/User");
const {generateUID, buildBaseUsername} = require("../utils/generateUID.utils");
const {parseGlobalPhoneNumber} = require("../utils/phoneUtils.utils");
const { createLoginHistoryEntry } = require("../utils/loginHistoryHelper.utils");
const { createNotification } = require('../services/notification.service');
const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const { validateAndNormalizePhoneNumber } = require("../utils/phoneUtils.utils");
const sendEmail = require("../services/email.service");
const welcomeEmailTemplate = require("../emails/welcomeEmail.template");
const loginNotificationTemplate = require("../emails/loginNotification.template");
const { shouldSendLoginNotification } = require("../utils/loginNotificationHelper.utils");



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
      message: t(messages.VALIDATION_ERROR, req.lang) 
    });
  }

  const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, password } = req.body;

  // 2. Check if email exists
  const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingUserByEmail) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.EMAIL_ALREADY_EXISTS, req.lang) 
    });
  }

  // 3. Validate + Normalize phone (UTIL)
  const { value: finalPhone, error: phoneError } = validateAndNormalizePhoneNumber(phoneNumber);

  if (phoneError) {
    return res.status(400).json({
      success: false,
      message: t(messages[phoneError], req.lang)
    });
  }

  // 4. Check if phone exists
  const existingUserByPhone = await User.findOne({ 
    "phoneNumber.fullNumber": finalPhone.fullNumber
  });

  if (existingUserByPhone) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.PHONE_ALREADY_EXISTS, req.lang) 
    });
  }

  // 5. Hash password
  const salt = 10;
  const hashedPassword = await bcrypt.hash(password, salt);

  // 6. Create login history
  const loginEntry = await createLoginHistoryEntry(req, 'local', true);

  let newUser;

  const baseUsername = buildBaseUsername(firstName, lastName);
  let usernameCounter = 0;

  // 7. Create user (handle duplicates)
  while (true) {
    try {
      const uid = generateUID(10);

      const username = usernameCounter === 0
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
        providers: [{
          provider: "local",
          providerId: uid,
          email: email.toLowerCase(),
          createdAt: new Date()
        }],
        loginHistory: [loginEntry],
        lastLoginIP: loginEntry.ipAddress,
        lastLoginTime: loginEntry.loginTime
      });

      await newUser.save();
      break;

    } catch (err) {

      const isDuplicate =
        err.code === 11000 ||
        err.name === 'MongoServerError' ||
        err.name === 'MongooseError'; 
  
      if (isDuplicate) {
        if (err.message.includes('uid')) continue;
        if (err.message.includes('username')) {
          usernameCounter++;
          continue;
        }
      }

      throw err;
    }
  }

  // 8. Welcome notification and email
  if (!newUser.hasWelcomeNotification) {
    await createNotification({
      userId: newUser._id,
      type: 'success',
      title: messages.WELCOME_TITLE,
      message: messages.WELCOME_MESSAGE,
      lang: req.lang,
      vars: { firstName: newUser.firstName }
    });

    newUser.hasWelcomeNotification = true;
    await newUser.save();

    // Send welcome email
    try {
      console.log('Sending welcome email with language:', req.lang);
      const html = welcomeEmailTemplate({
        firstName: newUser.firstName,
        logoUrl: `${process.env.API_URL}/public/images/logo.png`,
        lang: req.lang
      });

      await sendEmail({
        to: newUser.email,
        subject: t(messages.WELCOME_TITLE, req.lang),
        html
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
  }

  // 9. Generate token
  const token = newUser.generateAuthToken();

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
    updatedAt: newUser.updatedAt
  };

  return res.status(201).json({
    success: true,
    message: t(messages.USER_REGISTERED, req.lang),
    data: {
      user: userResponse,
      token
    }
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
      message: t(messages.INVALID_USER_ID, req.lang) 
    });
  }

  // Validate request body
  const { error } = validateCompleteProfile(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang)
    });
  }

  const { phoneNumber, dateOfBirth, gender } = req.body;
  const userId = req.params.id;

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // Check if user is an OAuth user
  if (user.primaryProvider === 'local') {
    return res.status(400).json({ 
      success: false,
      message: t(messages.NOT_OAUTH_USER, req.lang) 
    });
  }

  // Check if profile is already completed
  if (user.phoneNumber && user.dateOfBirth && user.gender) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.PROFILE_ALREADY_COMPLETED, req.lang) 
    });
  }

  // 🔥 نفس logic تاع register (validate + normalize)
  const { value: finalPhone, error: phoneError } = validateAndNormalizePhoneNumber(phoneNumber);

  if (phoneError) {
    return res.status(400).json({
      success: false,
      message: t(messages[phoneError], req.lang)
    });
  }

  // Check if phone number already exists for another user
  const existingUserByPhone = await User.findOne({ 
    "phoneNumber.fullNumber": finalPhone.fullNumber 
  });

  if (existingUserByPhone && existingUserByPhone._id.toString() !== userId) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.PHONE_ALREADY_EXISTS, req.lang) 
    });
  }

  // Validate age (must be at least 13 years old)
  const today = new Date();
  const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());

  if (new Date(dateOfBirth) > minAge) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.INVALID_AGE, req.lang) 
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
      user: userResponse
    }
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
      message: t(messages.VALIDATION_ERROR, req.lang) 
    });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.INVALID_CREDENTIALS, req.lang) 
    });
  }

  // Check if user account is suspended
  if (!user.isActive) {
    return res.status(403).json({ 
      success: false,
      message: t(messages.ACCOUNT_SUSPENDED, req.lang) 
    });
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.INVALID_CREDENTIALS, req.lang) 
    });
  }

  // Create login history entry
  const loginEntry = await createLoginHistoryEntry(req, 'local', true);
  
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
  if (shouldSendLoginNotification(user._id.toString(), loginEntry.ipAddress, req.headers['user-agent'])) {
    try {
      const html = loginNotificationTemplate({
        firstName: user.firstName,
        loginTime: loginEntry.loginTime,
        ipAddress: loginEntry.ipAddress,
        location: loginEntry.location,
        browser: loginEntry.browser,
        device: loginEntry.device,
        os: loginEntry.os,
        logoUrl: `${process.env.API_URL}/public/images/logo.png`,
        lang: req.lang
      });

      await sendEmail({
        to: user.email,
        subject: t(messages.LOGIN_NOTIFICATION_SUBJECT || 'New Login to Your Account', req.lang),
        html
      });
    } catch (emailError) {
      console.error('Failed to send login notification email:', emailError);
    }
  }

  // Generate JWT token
  const token = user.generateAuthToken();

  // Remove sensitive data from response


  res.status(200).json({
    success: true,
    message: t(messages.LOGIN_SUCCESS, req.lang),
    data: {
      token
    }
  });

});