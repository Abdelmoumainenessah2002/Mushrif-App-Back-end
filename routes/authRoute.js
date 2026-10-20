const router = require('express').Router();
const passport = require('../config/passport');
const { 
  registerUserCtrl, 
  completeProfileCtrl, 
  loginUserCtrl,
  refreshTokenCtrl,
  logoutUserCtrl,
  logoutAllDevicesCtrl
} = require('../controllers/authController');
const { createLoginHistoryEntry } = require('../utils/loginHistoryHelper.utils');
const { createNotification } = require('../services/notification.service');
const t = require('../utils/t.utils');
const messages = require('../constants/messages');
const { verifyToken, verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');
const sendEmail = require('../services/email.service');
const loginNotificationTemplate = require('../emails/loginNotification.template');
const { shouldSendLoginNotification } = require('../utils/loginNotificationHelper.utils');
const sessionService = require('../services/session.service');
const {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenCookieOptions
} = require('../utils/token.utils');
const { renderOAuthSuccessPage } = require('../utils/oauthResponseTemplate.utils');
const { 
  loginLimiter, 
  registerLimiter, 
  completeProfileLimiter, 
  oauthLimiter 
} = require('../middlewares/rateLimiter.middleware');

// Regular registration
router.post('/register', registerLimiter, registerUserCtrl);

// Regular login
router.post('/login', loginLimiter, loginUserCtrl);

// Refresh Access Token
router.post('/refresh', refreshTokenCtrl);

// Logout current device
router.post('/logout', logoutUserCtrl);

// Logout all devices
router.post('/logout-all', verifyToken, logoutAllDevicesCtrl);

// Complete profile for OAuth users
router.post('/complete-profile/:id', completeProfileLimiter, verifyTokenAndOnlyUser, completeProfileCtrl);

// Google OAuth routes
router.get('/google', 
  oauthLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], state: true })
);

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    try {
      if (err) {
        return res.status(err.statusCode || 500).json({
          success: false,
          message: t(err.messageKey || messages.OAUTH_AUTH_FAILED, req.lang)
        });
      }
      if (info && info.statusCode) {
        return res.status(info.statusCode).json({
          success: false,
          message: t(info.messageKey, req.lang)
        });
      }
      if (!user) {
        return res.status(401).json({
          success: false,
          message: t(messages.OAUTH_AUTH_FAILED, req.lang)
        });
      }

      // Check if user is suspended or deleted
      if (!user.isActive || user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: t(messages.ACCOUNT_SUSPENDED, req.lang)
        });
      }

      // Create login history entry
      const loginEntry = await createLoginHistoryEntry(req, 'google', true);

      // Add login history to user
      if (!user.loginHistory) {
        user.loginHistory = [];
      }
      user.loginHistory.push(loginEntry);

      // Save user with login history
      await user.save();

      // Send login notification email (with duplicate prevention)
      // Only for existing users, not first-time registration
      if (user.loginHistory && user.loginHistory.length > 1) {
        if (await shouldSendLoginNotification(user._id.toString(), loginEntry.ipAddress, req.headers['user-agent'])) {
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

            await sendEmail({
              to: user.email,
              subject: t(messages.LOGIN_NOTIFICATION_SUBJECT, req.lang),
              html
            });
          } catch (emailError) {
            console.error('Failed to send login notification email (Google OAuth):', emailError);
          }
        }
      }

      // Create welcome notification (only once)
      if (!user.hasWelcomeNotification) {
        await createNotification({
          userId: user._id,
          type: 'success',
          title: messages.WELCOME_TITLE,
          message: messages.WELCOME_MESSAGE,
          lang: req.lang,
          vars: { firstName: user.firstName }
        });

        user.hasWelcomeNotification = true;
        await user.save();
      }

      // 1. Create Redis session
      let sessionId;
      try {
        sessionId = await sessionService.createSession(user._id.toString());
      } catch (sessionErr) {
        console.error('[Google OAuth] Session creation failed:', sessionErr);
        return res.status(503).json({
          success: false,
          message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang)
        });
      }

      // 2. Generate Access Token & Refresh Token
      const accessToken = generateAccessToken(user, sessionId);
      const refreshToken = generateRefreshToken(user, sessionId);

      // 3. Set HttpOnly Cookie for Refresh Token
      res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

      // 4. Render rich HTML response page in the browser
      const htmlResponse = renderOAuthSuccessPage({
        user,
        accessToken,
        sessionId,
        provider: 'google',
        loginEntry,
        lang: req.lang || 'en'
      });

      return res.status(200).send(htmlResponse);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        success: false,
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message
      });
    }
  })(req, res, next);
});

// Facebook OAuth routes
router.get('/facebook',
  oauthLimiter,
  passport.authenticate('facebook', { scope: ['email'], state: true })
);

router.get('/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', { session: false }, async (err, user, info) => {
      try {
        if (err) {
          return res.status(err.statusCode || 500).json({
            success: false,
            message: t(err.messageKey || messages.OAUTH_AUTH_FAILED, req.lang)
          });
        }
        if (info && info.statusCode) {
          return res.status(info.statusCode).json({
            success: false,
            message: t(info.messageKey, req.lang)
          });
        }
        if (!user) {
          return res.status(401).json({
            success: false,
            message: t(messages.OAUTH_AUTH_FAILED, req.lang)
          });
        }

        // Check if user is suspended or deleted
        if (!user.isActive || user.isDeleted) {
          return res.status(403).json({
            success: false,
            message: t(messages.ACCOUNT_SUSPENDED, req.lang)
          });
        }

        // Create login history entry
        const loginEntry = await createLoginHistoryEntry(req, 'facebook', true);

        // Add login history to user
        if (!user.loginHistory) {
          user.loginHistory = [];
        }
        user.loginHistory.push(loginEntry);

        // Save user with login history
        await user.save();

        // Send login notification email (with duplicate prevention)
        // Only for existing users, not first-time registration
        if (user.loginHistory && user.loginHistory.length > 1) {
          if (await shouldSendLoginNotification(user._id.toString(), loginEntry.ipAddress, req.headers['user-agent'])) {
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

              await sendEmail({
                to: user.email,
                subject: t(messages.LOGIN_NOTIFICATION_SUBJECT, req.lang),
                html
              });
            } catch (emailError) {
              console.error('Failed to send login notification email (Facebook OAuth):', emailError);
            }
          }
        }

        // Create welcome notification (only once)
        if (!user.hasWelcomeNotification) {
          await createNotification({
            userId: user._id,
            type: 'success',
            title: messages.WELCOME_TITLE,
            message: messages.WELCOME_MESSAGE,
            lang: req.lang,
            vars: { firstName: user.firstName }
          });

          user.hasWelcomeNotification = true;
          await user.save();
        }

        // 1. Create Redis session
        let sessionId;
        try {
          sessionId = await sessionService.createSession(user._id.toString());
        } catch (sessionErr) {
          console.error('[Facebook OAuth] Session creation failed:', sessionErr);
          return res.status(503).json({
            success: false,
            message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang)
          });
        }

        // 2. Generate Access Token & Refresh Token
        const accessToken = generateAccessToken(user, sessionId);
        const refreshToken = generateRefreshToken(user, sessionId);

        // 3. Set HttpOnly Cookie for Refresh Token
        res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

        // log the successful OAuth login information for debugging purposes
        console.log(`[Facebook OAuth] User ${user._id} logged in successfully. Session ID: ${sessionId}`);

        // 4. Render rich HTML response page in the browser
        const htmlResponse = renderOAuthSuccessPage({
          user,
          accessToken,
          sessionId,
          provider: 'facebook',
          loginEntry,
          lang: req.lang || 'en'
        });

        return res.status(200).send(htmlResponse);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        success: false,
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message
      });
    }
  })(req, res, next);
});

// GitHub OAuth routes
router.get('/github',
  oauthLimiter,
  passport.authenticate('github', {
    scope: ["read:user", "user:email"],
    prompt: 'consent',
    state: true
  })
);

router.get('/github/callback',
  (req, res, next) => {
    passport.authenticate('github', { session: false }, async (err, user, info) => {
      try {
        if (err) {
          return res.status(err.statusCode || 500).json({
            success: false,
            message: t(err.messageKey || messages.OAUTH_AUTH_FAILED, req.lang)
          });
        }
        if (info && info.statusCode) {
          return res.status(info.statusCode).json({
            success: false,
            message: t(info.messageKey, req.lang)
          });
        }
        if (!user) {
          return res.status(401).json({
            success: false,
            message: t(messages.OAUTH_AUTH_FAILED, req.lang)
          });
        }

        // Check if user is suspended or deleted
        if (!user.isActive || user.isDeleted) {
          return res.status(403).json({
            success: false,
            message: t(messages.ACCOUNT_SUSPENDED, req.lang)
          });
        }

        // Create login history entry
        const loginEntry = await createLoginHistoryEntry(req, 'github', true);

        // Add login history to user
        if (!user.loginHistory) {
          user.loginHistory = [];
        }
        user.loginHistory.push(loginEntry);

        // Save user with login history
        await user.save();

        // Send login notification email (with duplicate prevention)
        // Only for existing users, not first-time registration
        if (user.loginHistory && user.loginHistory.length > 1) {
          if (await shouldSendLoginNotification(user._id.toString(), loginEntry.ipAddress, req.headers['user-agent'])) {
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

              await sendEmail({
                to: user.email,
                subject: t(messages.LOGIN_NOTIFICATION_SUBJECT, req.lang),
                html
              });
            } catch (emailError) {
              console.error('Failed to send login notification email (GitHub OAuth):', emailError);
            }
          }
        }

        // Create welcome notification (only once)
        if (!user.hasWelcomeNotification) {
          await createNotification({
            userId: user._id,
            type: 'success',
            title: messages.WELCOME_TITLE,
            message: messages.WELCOME_MESSAGE,
            lang: req.lang,
            vars: { firstName: user.firstName }
          });

          user.hasWelcomeNotification = true;
          await user.save();
        }

        // 1. Create Redis session
        let sessionId;
        try {
          sessionId = await sessionService.createSession(user._id.toString());
        } catch (sessionErr) {
          console.error('[GitHub OAuth] Session creation failed:', sessionErr);
          return res.status(503).json({
            success: false,
            message: t(messages.AUTH_SERVICE_UNAVAILABLE, req.lang)
          });
        }

        // 2. Generate Access Token & Refresh Token
        const accessToken = generateAccessToken(user, sessionId);
        const refreshToken = generateRefreshToken(user, sessionId);

        // 3. Set HttpOnly Cookie for Refresh Token
        res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

        // 4. Render rich HTML response page in the browser
        const htmlResponse = renderOAuthSuccessPage({
          user,
          accessToken,
          sessionId,
          provider: 'github',
          loginEntry,
          lang: req.lang || 'en'
        });

        return res.status(200).send(htmlResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message
      });
    }
  })(req, res, next);
});

module.exports = router;