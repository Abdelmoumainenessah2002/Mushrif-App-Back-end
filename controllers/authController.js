const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { 
  User, 
  validateRegisterUser, 
  validateLoginUser,
  validateCompleteProfile,
  validateUserId 
} = require("../models/User");
const {generateUID, buildBaseUsername} = require("../utils/generateUID");
const {formatPhoneNumber} = require("../utils/phoneUtils");
const { createLoginHistoryEntry } = require("../utils/loginHistoryHelper");
const { createNotification } = require('../services/notification.service');
const t = require("../utils/t");
const messages = require("../constants/messages");



/**
 * @desc    Register new user
 * @method  Post
 * @route   /api/auth/register
 * @access  Public
 */


module.exports.registerUserCtrl = asyncHandler(async (req, res) => {
  // Validate request body
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang) 
    });
  }

  const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, password } = req.body;

  // Check if user already exists by email
  const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingUserByEmail) {
    return res.status(400).json({ 
      success: false,
      message: t(messages.EMAIL_ALREADY_EXISTS, req.lang) 
    });
  }

  // Check if user already exists by phone number
  const phoneString = formatPhoneNumber(phoneNumber);
  if (phoneString) {
    const existingUserByPhone = await User.findOne({ 
      $or: [
        { 'phoneNumber.fullNumber': phoneString },
        { 'phoneNumber.fullNumber': phoneNumber.fullNumber }
      ]
    });
    if (existingUserByPhone) {
      return res.status(400).json({ 
        success: false,
        message: t(messages.PHONE_ALREADY_EXISTS, req.lang) 
      });
    }
  }

  // Hash password
  const salt = 10;
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create login history entry
  const loginEntry = await createLoginHistoryEntry(req, 'local', true);

  let newUser;

  const baseUsername = buildBaseUsername(firstName, lastName);
  let usernameCounter = 0;

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
        phoneNumber,
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
    
        if (err.message.includes('uid')) {
          continue;
        }
    
        if (err.message.includes('username')) {
          usernameCounter++;
          continue;
        }
      }
    
      throw err;
    }
  }

  // Create welcome notification (only once)
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
  }

  // Generate JWT token
  const token = newUser.generateAuthToken();

  // Remove sensitive data from response
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

  res.status(201).json({
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

  console.log("USER:", user);
  console.log("PRIMARY PROVIDER:", user?.primaryProvider);

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

  // Check if phone number already exists for another user
  const phoneString = formatPhoneNumber(phoneNumber);
  if (phoneString) {
    const existingUserByPhone = await User.findOne({ 
      _id: { $ne: userId }, // Exclude current user
      $or: [
        { 'phoneNumber.fullNumber': phoneString },
        { 'phoneNumber.fullNumber': phoneNumber.fullNumber }
      ]
    });
    if (existingUserByPhone) {
      return res.status(400).json({ 
        success: false,
        message: t(messages.PHONE_ALREADY_EXISTS, req.lang) 
      });
    }
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

  // Update user profile
  user.phoneNumber = phoneNumber;
  user.dateOfBirth = new Date(dateOfBirth);
  user.gender = gender;

  // Save updated user
  await user.save();

  // Remove sensitive data from response
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

  res.status(200).json({
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