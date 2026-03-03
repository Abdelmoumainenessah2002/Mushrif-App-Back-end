const { User } = require('../models/User');
const { generateUID, generateUsername } = require('../utils/generateUID');
const t = require('../utils/t');
const messages = require('../constants/messages');
const { getGitHubPrimaryEmail } = require('../utils/getGithubEmailsHelper');

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
      // Fail fast: do not mutate state if account is inactive
      if (!isUserActive(user)) {
        return {
          success: false,
          error: {
            statusCode: 403,
            messageKey: messages.ACCOUNT_SUSPENDED
          }
        };
      }
      // User already connected to this OAuth provider and is ACTIVE
      await updateUserLoginInfo(user, ipAddress);
      return { user, isNewUser: false };
    }

    // Step 2: Check if user exists with this email
    // Step 2: Check if user exists with this email
    const email = await extractEmail(profile, provider, tokens);
    if (email && !email.endsWith('.temp')) {
      user = await User.findOne({ email });

      if (user) {
        // Fail fast: do not link provider or update anything if account is inactive
        if (!isUserActive(user)) {
          return {
            success: false,
            error: {
              statusCode: 403,
              messageKey: messages.ACCOUNT_SUSPENDED
            }
          };
        }
        // User exists with same email, is ACTIVE — safe to link and update
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

    // Step 3: Create new user (no existing user found)
    user = await createNewOAuthUser(profile, provider, tokens, email, ipAddress);
    return { user, isNewUser: true, isLinked: false };

  } catch (error) {
    return {
      success: false,
      error: {
        statusCode: 500,
        messageKey: messages.OAUTH_AUTH_FAILED
      }
    };
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
    lastLoginTime: new Date(),
    isVerified: true,
  });

  return await newUser.save();
}

/**
 * Extract email based on provider
 */
async function extractEmail(profile, provider, tokens) {
  if (provider === 'facebook' && !profile.emails?.[0]?.value) {
    return `${profile.id}@facebook.temp`;
  }

  if (provider === 'github') {
    if (profile.githubPrimaryEmail) {
      return profile.githubPrimaryEmail.toLowerCase();
    } else {
      return await getGitHubPrimaryEmail(tokens.accessToken);
    }
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
 * Returns an object instead of throwing; use for controlled API responses.
 * @returns {{ valid: true } | { valid: false, statusCode: number, messageKey: string }}
 */
function validateUserStatus(user) {
  if (!isUserActive(user)) {
    return {
      valid: false,
      statusCode: 403,
      messageKey: messages.ACCOUNT_SUSPENDED
    };
  }
  return { valid: true };
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
