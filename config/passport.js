require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const fetch = require('node-fetch');
const { User } = require('../models/User');
const oAuthService = require('../services/OAuth.service');

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

    // Validate user is active
    oAuthService.validateUserStatus(result.user);

    return done(null, result.user);
  } catch (error) {
    return done(error, null);
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

    // Validate user is active
    oAuthService.validateUserStatus(result.user);

    return done(null, result.user);
  } catch (error) {
    return done(error, null);
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

    // Fetch primary email from GitHub API if needed
    let githubPrimaryEmail = null;
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'Mushrif-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const emails = await emailRes.json();
      if (emailRes.ok && Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified);
        if (primary) {
          githubPrimaryEmail = primary.email.toLowerCase();
        }
      }
    } catch (_) {
      // GitHub API call failed, continue with profile data
    }

    // Inject GitHub primary email into profile for service
    profile.githubPrimaryEmail = githubPrimaryEmail;

    // Use OAuth service to handle user logic
    const result = await oAuthService.handleOAuthUser(
      profile,
      'github',
      { accessToken, refreshToken },
      ipAddress
    );

    // Validate user is active
    oAuthService.validateUserStatus(result.user);

    return done(null, result.user);
  } catch (error) {
    return done(error, null);
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
