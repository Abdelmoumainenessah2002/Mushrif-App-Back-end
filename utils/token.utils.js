const jwt = require('jsonwebtoken');

/**
 * ============================================================================
 * Token Utility - Access & Refresh Token Management (Mushrif Backend)
 * ============================================================================
 */

const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION = '30d'; // 30 days
const REFRESH_TOKEN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

/**
 * Retrieves and validates the dedicated ACCESS_TOKEN_SECRET
 * @returns {string}
 */
function getAccessTokenSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('[TokenUtils] ACCESS_TOKEN_SECRET is not configured in environment variables');
  }
  return secret;
}

/**
 * Retrieves and validates the dedicated REFRESH_TOKEN_SECRET
 * @returns {string}
 */
function getRefreshTokenSecret() {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('[TokenUtils] REFRESH_TOKEN_SECRET is not configured in environment variables');
  }
  return secret;
}

/**
 * Generates a short-lived access token (15m) with explicit type claim
 * @param {Object} user - User document or object with _id and role
 * @param {string} sessionId - Cryptographically secure session ID
 * @returns {string} Signed JWT Access Token
 */
function generateAccessToken(user, sessionId) {
  if (!user || !user._id || !sessionId) {
    throw new Error('[TokenUtils] Invalid user or sessionId for generateAccessToken');
  }

  const payload = {
    id: user._id.toString(),
    role: user.role,
    sessionId: sessionId,
    type: 'access'
  };

  const secret = getAccessTokenSecret();
  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRATION
  });
}

/**
 * Generates a long-lived refresh token (30d) with explicit type claim
 * @param {Object} user - User document or object with _id
 * @param {string} sessionId - Cryptographically secure session ID
 * @returns {string} Signed JWT Refresh Token
 */
function generateRefreshToken(user, sessionId) {
  if (!user || !user._id || !sessionId) {
    throw new Error('[TokenUtils] Invalid user or sessionId for generateRefreshToken');
  }

  const payload = {
    id: user._id.toString(),
    sessionId: sessionId,
    type: 'refresh'
  };

  const secret = getRefreshTokenSecret();
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRATION
  });
}

/**
 * Verifies an access token and enforces type: "access"
 * @param {string} token
 * @returns {Object} Decoded payload
 */
function verifyAccessToken(token) {
  const secret = getAccessTokenSecret();
  const decoded = jwt.verify(token, secret);

  if (decoded.type !== 'access') {
    const error = new Error('Invalid token type: expected access token');
    error.name = 'InvalidTokenTypeError';
    throw error;
  }

  return decoded;
}

/**
 * Verifies a refresh token and enforces type: "refresh"
 * @param {string} token
 * @returns {Object} Decoded payload
 */
function verifyRefreshToken(token) {
  const secret = getRefreshTokenSecret();
  const decoded = jwt.verify(token, secret);

  if (decoded.type !== 'refresh') {
    const error = new Error('Invalid token type: expected refresh token');
    error.name = 'InvalidTokenTypeError';
    throw error;
  }

  return decoded;
}

/**
 * Returns standardized and configurable cookie options for storing the refresh token
 * @returns {Object} Cookie options
 */
function getRefreshTokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  // Configurable SameSite setting (validated against allowed values)
  let sameSite = (process.env.REFRESH_COOKIE_SAME_SITE || '').toLowerCase().trim();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    sameSite = isProd ? 'lax' : 'lax';
  }

  // Security requirement: SameSite=None requires Secure=true in browsers
  const secure = isProd || sameSite === 'none';

  // Configurable path (defaults to root '/')
  const cookiePath = process.env.REFRESH_COOKIE_PATH || '/';

  return {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    path: cookiePath
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenCookieOptions,
  getAccessTokenSecret,
  getRefreshTokenSecret,
  ACCESS_TOKEN_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION
};
