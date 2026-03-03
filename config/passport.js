require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const fetch = require('node-fetch');
const { User } = require('../models/User');
const oAuthService = require('../services/OAuth.service');
const messages = require('../constants/messages');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Get dynamic IP from request
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     '127.0.0.1';

    // Use OAuth service to handle user logic
    const result = await oAuthService.handleOAuthUser(
      profile,
      'google',
      { accessToken, refreshToken },
      ipAddress
    );

    if (result.error) {
      return done(null, null, result.error);
    }

    const validation = oAuthService.validateUserStatus(result.user);
    if (!validation.valid) {
      return done(null, null, { statusCode: validation.statusCode, messageKey: validation.messageKey });
    }

    return done(null, result.user);
  } catch (error) {
    return done(null, null, {
      statusCode: 500,
      messageKey: messages.OAUTH_AUTH_FAILED
    });
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'name', 'emails', 'photos'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Get dynamic IP from request
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     '127.0.0.1';

    // Use OAuth service to handle user logic
    const result = await oAuthService.handleOAuthUser(
      profile,
      'facebook',
      { accessToken, refreshToken },
      ipAddress
    );

    if (result.error) {
      return done(null, null, result.error);
    }

    const validation = oAuthService.validateUserStatus(result.user);
    if (!validation.valid) {
      return done(null, null, { statusCode: validation.statusCode, messageKey: validation.messageKey });
    }

    return done(null, result.user);
  } catch (error) {
    return done(null, null, {
      statusCode: 500,
      messageKey: messages.OAUTH_AUTH_FAILED
    });
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/auth/github/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     '127.0.0.1';
    
    // Use OAuth service to handle user logic
    const result = await oAuthService.handleOAuthUser(
      profile,
      'github',
      { accessToken, refreshToken },
      ipAddress
    );

    if (result.error) {
      return done(null, null, result.error);
    }

    const validation = oAuthService.validateUserStatus(result.user);
    if (!validation.valid) {
      return done(null, null, { statusCode: validation.statusCode, messageKey: validation.messageKey });
    }

    return done(null, result.user);
  } catch (error) {
    return done(null, null, {
      statusCode: 500,
      messageKey: messages.OAUTH_AUTH_FAILED
    });
  }
}));


// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
