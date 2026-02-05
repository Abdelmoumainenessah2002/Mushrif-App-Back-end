require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const fetch = require('node-fetch');
const { User } = require('../models/User');
const { generateUID, generateUsername } = require('../utils/generateUID');
const t = require('../utils/t');
const messages = require('../constants/messages');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    // Get dynamic IP and User Agent from request
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'OAuth-Google';

    // Check if user already exists with this Google ID
    let user = await User.findOne({ 
      'providers.provider': 'google',
      'providers.providerId': profile.id 
    });

    if (user) {
      // Update last login info (full login history will be added by route handler)
      user.lastLoginIP = ipAddress;
      user.lastLoginTime = new Date();
      await user.save();
      return done(null, user);
    }

    // Check if user exists with this email
    user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });

    if (user) {
      // Add Google provider to existing user
      const providerData = {
        provider: 'google',
        providerId: profile.id,
        email: profile.emails[0].value.toLowerCase(),
        displayName: profile.displayName,
        photoURL: profile.photos[0]?.value,
        accessToken,
        refreshToken,
        createdAt: new Date()
      };

      user.addProvider(providerData);
      
      // Update last login info (full login history will be added by route handler)
      user.lastLoginIP = ipAddress;
      user.lastLoginTime = new Date();
      
      await user.save();
      return done(null, user);
    }

    // Create new user
    const uid = await generateUID();
    const username = await generateUsername(
      profile.name.givenName || profile.displayName.split(' ')[0],
      profile.name.familyName || profile.displayName.split(' ')[1] || 'User'
    );

    const newUser = new User({
      username,
      uid,
      firstName: profile.name.givenName || profile.displayName.split(' ')[0],
      lastName: profile.name.familyName || profile.displayName.split(' ')[1] || 'User',
      email: profile.emails[0].value.toLowerCase(),
      primaryProvider: 'google',
      profilePhoto: {
        url: profile.photos[0]?.value || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        publicId: null
      },
      providers: [{
        provider: 'google',
        providerId: profile.id,
        email: profile.emails[0].value.toLowerCase(),
        displayName: profile.displayName,
        photoURL: profile.photos[0]?.value,
        accessToken,
        refreshToken,
        createdAt: new Date()
      }],
      loginHistory: [],
      lastLoginIP: ipAddress,
      lastLoginTime: new Date()
    });

    await newUser.save();
    return done(null, newUser);

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
    console.log(process.env.FACEBOOK_APP_ID);
    // Get dynamic IP and User Agent from request
    const ipAddress = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     '127.0.0.1';
    const userAgent = req.get('User-Agent') || 'OAuth-Facebook';

    // Check if user already exists with this Facebook ID
    let user = await User.findOne({ 
      'providers.provider': 'facebook',
      'providers.providerId': profile.id 
    });

    if (user) {
      // Update last login info for returning Facebook user (full login history will be added by route handler)
      user.lastLoginIP = ipAddress;
      user.lastLoginTime = new Date();
      
      await user.save();
      return done(null, user);
    }

    // Check if user exists with this email (if email is provided)
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;
    
    if (email) {
      user = await User.findOne({ email });

      if (user) {
        // Add Facebook provider to existing user
        const providerData = {
          provider: 'facebook',
          providerId: profile.id,
          email,
          displayName: profile.displayName,
          photoURL: profile.photos[0]?.value,
          accessToken,
          refreshToken,
          createdAt: new Date()
        };

        user.addProvider(providerData);
        
        // Update last login info for existing user (full login history will be added by route handler)
        user.lastLoginIP = ipAddress;
        user.lastLoginTime = new Date();
        
        await user.save();
        return done(null, user);
      }
    }

    // Create new user
    const uid = await generateUID();
    const username = await generateUsername(
      profile.name?.givenName || profile.displayName.split(' ')[0],
      profile.name?.familyName || profile.displayName.split(' ')[1] || 'User'
    );

    const newUser = new User({
      username,
      uid,
      firstName: profile.name?.givenName || profile.displayName.split(' ')[0],
      lastName: profile.name?.familyName || profile.displayName.split(' ')[1] || 'User',
      email: email || `${profile.id}@facebook.temp`, // Fallback email if not provided
      primaryProvider: 'facebook',
      profilePhoto: {
        url: profile.photos[0]?.value || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        publicId: null
      },
      providers: [{
        provider: 'facebook',
        providerId: profile.id,
        email: email || `${profile.id}@facebook.temp`,
        displayName: profile.displayName,
        photoURL: profile.photos[0]?.value,
        accessToken,
        refreshToken,
        createdAt: new Date()
      }],
      loginHistory: [],
      lastLoginIP: ipAddress,
      lastLoginTime: new Date()
    });

    await newUser.save();
    return done(null, newUser);

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
    const userAgent = req.get('User-Agent') || 'OAuth-GitHub';

    // Fetch primary email from GitHub API
    let primaryEmail = null;
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
          primaryEmail = primary.email.toLowerCase();
        }
      }
    } catch (_) {}

    const email = primaryEmail || 
                  (profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null) ||
                  `${profile.id}@github.temp`;

    let user = await User.findOne({ 
      'providers.provider': 'github',
      'providers.providerId': profile.id 
    });

    if (user) {
      // Update last login info (full login history will be added by route handler)
      user.lastLoginIP = ipAddress;
      user.lastLoginTime = new Date();
      await user.save();
      return done(null, user);
    }

    if (email && !email.endsWith('@github.temp')) {
      user = await User.findOne({ email });

      if (user) {
        const providerData = {
          provider: 'github',
          providerId: profile.id,
          email,
          displayName: profile.displayName || profile.username,
          photoURL: profile.photos[0]?.value,
          accessToken,
          refreshToken,
          createdAt: new Date()
        };

        user.addProvider(providerData);
        // Update last login info (full login history will be added by route handler)
        user.lastLoginIP = ipAddress;
        user.lastLoginTime = new Date();
        await user.save();
        return done(null, user);
      }
    }

    const uid = await generateUID();
    const username = await generateUsername(
      profile.name?.givenName || profile.displayName?.split(' ')[0] || profile.username,
      profile.name?.familyName || profile.displayName?.split(' ')[1] || 'User'
    );

    const newUser = new User({
      username,
      uid,
      firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || profile.username,
      lastName: profile.name?.familyName || profile.displayName?.split(' ')[1] || 'User',
      email: email || `${profile.id}@github.temp`,
      primaryProvider: 'github',
      profilePhoto: {
        url: profile.photos[0]?.value || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        publicId: null
      },
      providers: [{
        provider: 'github',
        providerId: profile.id,
        email: email || `${profile.id}@github.temp`,
        displayName: profile.displayName || profile.username,
        photoURL: profile.photos[0]?.value,
        accessToken,
        refreshToken,
        createdAt: new Date()
      }],
      loginHistory: [],
      lastLoginIP: ipAddress,
      lastLoginTime: new Date()
    });

    await newUser.save();
    return done(null, newUser);

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
