const { User } = require('../models/User');
const { generateUID, generateUsername } = require('../utils/generateUID');
const t = require('../utils/t');
const messages = require('../constants/messages');

/**
 * OAuth Service - Handles all OAuth-related business logic
 * Separates concerns from Passport strategies
 */

/**
 * Handle OAuth user authentication/registration
 * @param {Object} profile - OAuth profile from strategy
 * @param {string} provider - OAuth provider (google, facebook, github)
 * @param {Object} tokens - { accessToken, refreshToken }
 * @param {string} ipAddress - User's IP address
 * @returns {Object} - { user, isNewUser }
 */
async function handleOAuthUser(profile, provider, tokens, ipAddress) {
  try {
    // Step 1: Check if user exists with this provider ID
    let user = await findUserByProviderID(provider, profile.id);

    if (user) {
      // User already connected to this OAuth provider
      await updateUserLoginInfo(user, ipAddress);
      return { user, isNewUser: false, isLinked: true };
    }

    // Step 2: Check if user exists with this email
    const email = extractEmail(profile, provider);
    if (email && !email.endsWith('.temp')) {
      user = await User.findOne({ email });

      if (user) {
        // User exists with same email - link the OAuth provider
        await linkOAuthProvider(user, {
          provider,
          providerId: profile.id,
          email,
          displayName: profile.displayName || profile.username,
          photoURL: getProfilePhoto(profile),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        });

        await updateUserLoginInfo(user, ipAddress);
        return { user, isNewUser: false, isLinked: true };
      }
    }

    // Step 3: Create new user
    user = await createNewOAuthUser(profile, provider, tokens, email, ipAddress);
    return { user, isNewUser: true, isLinked: false };

  } catch (error) {
    throw new Error(`OAuth user handling failed: ${error.message}`);
  }
}

/**
 * Find user by provider and provider ID
 */
async function findUserByProviderID(provider, providerId) {
  return await User.findOne({
    'providers.provider': provider,
    'providers.providerId': providerId
  });
}

/**
 * Link OAuth provider to existing user
 */
async function linkOAuthProvider(user, providerData) {
  user.addProvider({
    provider: providerData.provider,
    providerId: providerData.providerId,
    email: providerData.email,
    displayName: providerData.displayName,
    photoURL: providerData.photoURL,
    accessToken: providerData.accessToken,
    refreshToken: providerData.refreshToken,
    createdAt: new Date()
  });

  return await user.save();
}

/**
 * Update user login information
 */
async function updateUserLoginInfo(user, ipAddress) {
  user.lastLoginIP = ipAddress;
  user.lastLoginTime = new Date();
  return await user.save();
}

/**
 * Create new OAuth user
 */
async function createNewOAuthUser(profile, provider, tokens, email, ipAddress) {
  const uid = await generateUID();
  const { firstName, lastName } = extractUserNames(profile);

  const username = await generateUsername(firstName, lastName);

  const newUser = new User({
    username,
    uid,
    firstName,
    lastName,
    email: email || `${profile.id}@${provider}.temp`,
    primaryProvider: provider,
    profilePhoto: {
      url: getProfilePhoto(profile) || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      publicId: null
    },
    providers: [{
      provider,
      providerId: profile.id,
      email: email || `${profile.id}@${provider}.temp`,
      displayName: profile.displayName || profile.username,
      photoURL: getProfilePhoto(profile),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      createdAt: new Date()
    }],
    loginHistory: [],
    lastLoginIP: ipAddress,
    lastLoginTime: new Date()
  });

  return await newUser.save();
}

/**
 * Extract email based on provider
 */
function extractEmail(profile, provider) {
  if (provider === 'facebook' && !profile.emails?.[0]?.value) {
    return `${profile.id}@facebook.temp`;
  }

  if (provider === 'github') {
    return profile.emails?.[0]?.value?.toLowerCase() || null;
  }

  // Google
  return profile.emails?.[0]?.value?.toLowerCase() || null;
}

/**
 * Extract first and last names from profile
 */
function extractUserNames(profile) {
  let firstName = profile.name?.givenName ||
                  profile.displayName?.split(' ')[0] ||
                  profile.username ||
                  'User';

  let lastName = profile.name?.familyName ||
                 profile.displayName?.split(' ')[1] ||
                 'User';

  return { firstName, lastName };
}

/**
 * Get profile photo URL
 */
function getProfilePhoto(profile) {
  return profile.photos?.[0]?.value || null;
}

/**
 * Check if user account is active
 */
function isUserActive(user) {
  return user.isActive === true;
}

/**
 * Validate user before login
 * Throws error if user is suspended
 */
function validateUserStatus(user) {
  if (!isUserActive(user)) {
    const error = new Error(messages.ACCOUNT_SUSPENDED);
    error.statusCode = 403;
    error.isSuspended = true;
    throw error;
  }
}

module.exports = {
  handleOAuthUser,
  findUserByProviderID,
  linkOAuthProvider,
  updateUserLoginInfo,
  createNewOAuthUser,
  extractEmail,
  extractUserNames,
  getProfilePhoto,
  isUserActive,
  validateUserStatus
};
