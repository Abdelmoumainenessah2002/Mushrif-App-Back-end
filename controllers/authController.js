const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { 
  User, 
  validateRegisterUser, 
  validateLoginUser,
  validateOAuthUser,
  validateCompleteProfile,
  validateUserId 
} = require("../models/User");
const {generateUID, generateUsername} = require("../utils/generateUID");
const {formatPhoneNumber} = require("../utils/phoneUtils");
const { createLoginHistoryEntry } = require("../utils/loginHistoryHelper");
const { createNotification } = require('../services/notification.service');

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
      message: error.details[0].message 
    });
  }

  const { firstName, lastName, email, phoneNumber, dateOfBirth, gender, password } = req.body;

  // Check if user already exists by email
  const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingUserByEmail) {
    return res.status(400).json({ 
      success: false,
      message: "User with this email already exists" 
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
        message: "User with this phone number already exists" 
      });
    }
  }

  // Generate unique UID (8 digits) - using your existing function
  const uid = await generateUID();

  // Generate username based on first and last name
  const username = await generateUsername(firstName, lastName);

  // Hash password
  const salt = 10;
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create login history entry
  const loginEntry = await createLoginHistoryEntry(req, 'local', true);

  // Create new user
  const newUser = new User({
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

  // Save user to database
  await newUser.save();

  // Create welcome notification (only once)
  if (!newUser.hasWelcomeNotification) {
    await createNotification({
      userId: newUser._id,
      type: 'success',
      title: 'Welcome to Mushrif!',
      message: `Hello ${newUser.firstName}, welcome to Mushrif! We're excited to have you on board. Explore our features and let us know if you need any assistance. Happy exploring!`
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
    message: "User registered successfully",
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
  // Debug logs
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('Content-Type:', req.get('Content-Type'));

  // Check if req.body exists
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ 
      success: false,
      message: "Request body is empty. Please provide phoneNumber, dateOfBirth, and gender." 
    });
  }

  // Validate user ID parameter
  const { error: idError } = validateUserId(req.params);
  if (idError) {
    return res.status(400).json({ 
      success: false,
      message: idError.details[0].message 
    });
  }

  // Validate request body
  const { error } = validateCompleteProfile(req.body);
  if (error) {
    return res.status(400).json({ 
      success: false,
      message: error.details[0].message 
    });
  }

  const { phoneNumber, dateOfBirth, gender } = req.body;
  const userId = req.params.id;

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: "User not found" 
    });
  }

  // Check if user is an OAuth user
  if (!user.isOAuthUser) {
    return res.status(400).json({ 
      success: false,
      message: "This endpoint is only for OAuth users" 
    });
  }

  // Check if profile is already completed
  if (user.phoneNumber && user.dateOfBirth && user.gender) {
    return res.status(400).json({ 
      success: false,
      message: "Profile is already completed" 
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
        message: "User with this phone number already exists" 
      });
    }
  }

  // Validate age (must be at least 13 years old)
  const today = new Date();
  const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  if (new Date(dateOfBirth) > minAge) {
    return res.status(400).json({ 
      success: false,
      message: "You must be at least 13 years old" 
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
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    isActive: user.isActive,
    isOAuthUser: user.isOAuthUser,
    primaryProvider: user.primaryProvider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.status(200).json({
    success: true,
    message: "Profile completed successfully",
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
      message: error.details[0].message 
    });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid email or password" 
    });
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ 
      success: false,
      message: "Invalid email or password" 
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
    message: "User logged in successfully",
    data: {
      token
    }
  });

});