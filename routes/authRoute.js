const router = require('express').Router();
const passport = require('../config/passport');
const { 
  registerUserCtrl, 
  completeProfileCtrl, 
  loginUserCtrl
} = require('../controllers/authController');
const { createLoginHistoryEntry } = require('../utils/loginHistoryHelper');
const { createNotification } = require('../services/notification.service');
const t = require('../utils/t');
const messages = require('../constants/messages');



// Regular registration
router.post('/register', registerUserCtrl);

// Regular login
router.post('/login', loginUserCtrl);

// Complete profile for OAuth users
router.post('/complete-profile/:id', completeProfileCtrl);

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: t(messages.OAUTH_AUTH_FAILED, req.lang)
        });
      }

      // Check if user is suspended
      if (!req.user.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: t(messages.ACCOUNT_SUSPENDED, req.lang) 
        });
      }

      // Create login history entry
      const loginEntry = await createLoginHistoryEntry(req, 'google', true);
      
      // Add login history to user
      if (!req.user.loginHistory) {
        req.user.loginHistory = [];
      }
      req.user.loginHistory.push(loginEntry);
      
      // Save user with login history
      await req.user.save();

      // Create welcome notification (only once)
      if (!req.user.hasWelcomeNotification) {
        await createNotification({
          userId: req.user._id,
          type: 'success',
          title: messages.WELCOME_TITLE,
          message: messages.WELCOME_MESSAGE,
          lang: req.lang,
          vars: { firstName: req.user.firstName }
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }

      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with language-based content
      const pageTitle = t(messages.OAUTH_LOGIN_SUCCESS, req.lang);
      
      res.send(`
        <!DOCTYPE html>
        <html dir="${req.lang === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .success { 
              background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
              border-left: 5px solid #2ecc71; 
              padding: 25px; 
              border-radius: 10px; 
              margin-bottom: 30px;
            }
            .success h2 {
              color: #27ae60;
              margin-bottom: 15px;
              font-size: 28px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .info-section h3 {
              margin-top: 0;
              margin-bottom: 15px;
              color: #667eea;
              font-size: 18px;
            }
            .token { 
              background: #2c3e50; 
              color: #ecf0f1;
              padding: 20px; 
              border-radius: 8px; 
              word-break: break-all; 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              border: 2px solid #3498db;
              overflow-x: auto;
              margin: 15px 0;
            }
            .info-row {
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
              display: flex;
              justify-content: space-between;
              ${req.lang === 'ar' ? 'direction: rtl;' : ''}
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #2c3e50;
              min-width: 150px;
            }
            .value {
              color: #34495e;
              text-align: right;
              ${req.lang === 'ar' ? 'text-align: left;' : ''}
            }
            .warning {
              background: #fff3cd;
              border-left: 5px solid #ff9800;
              color: #856404;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 14px;
            }
            .warning strong {
              color: #ff9800;
            }
            .emoji {
              margin-right: 8px;
            }
            .button-group {
              margin-top: 30px;
              text-align: center;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2><span class="emoji">🎉</span>${pageTitle}</h2>
            </div>

            <div class="info-section">
              <h3><span class="emoji">👤</span>User Information</h3>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${req.user.firstName} ${req.user.lastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${req.user.email}</span>
              </div>
              <div class="info-row">
                <span class="label">Username:</span>
                <span class="value">${req.user.username}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🖥️</span>Device Information</h3>
              <div class="info-row">
                <span class="label">Browser:</span>
                <span class="value">${loginEntry.browser.name} ${loginEntry.browser.version}</span>
              </div>
              <div class="info-row">
                <span class="label">Device Type:</span>
                <span class="value">${loginEntry.device.type}</span>
              </div>
              <div class="info-row">
                <span class="label">Operating System:</span>
                <span class="value">${loginEntry.os.name} ${loginEntry.os.version}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">📍</span>Login Location</h3>
              <div class="info-row">
                <span class="label">IP Address:</span>
                <span class="value">${loginEntry.ipAddress}</span>
              </div>
              <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${loginEntry.location.city}, ${loginEntry.location.region}, ${loginEntry.location.country}</span>
              </div>
              <div class="info-row">
                <span class="label">Timezone:</span>
                <span class="value">${loginEntry.location.timezone}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🔑</span>Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                <strong>⚠️ Important:</strong> Save this token securely. You'll need it for API authentication. Keep it confidential!
              </div>
            </div>

            <div class="button-group">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Back to App</a>
            </div>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ 
        success: false, 
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message 
      });
    }
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: t(messages.OAUTH_AUTH_FAILED, req.lang)
        });
      }

      // Check if user is suspended
      if (!req.user.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: t(messages.ACCOUNT_SUSPENDED, req.lang) 
        });
      }

      // Create login history entry
      const loginEntry = await createLoginHistoryEntry(req, 'facebook', true);
      
      // Add login history to user
      if (!req.user.loginHistory) {
        req.user.loginHistory = [];
      }
      req.user.loginHistory.push(loginEntry);
      
      // Save user with login history
      await req.user.save();

      // Create welcome notification (only once)
      if (!req.user.hasWelcomeNotification) {
        await createNotification({
          userId: req.user._id,
          type: 'success',
          title: messages.WELCOME_TITLE,
          message: messages.WELCOME_MESSAGE,
          lang: req.lang,
          vars: { firstName: req.user.firstName }
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }
      
      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with language-based content
      const pageTitle = t(messages.OAUTH_LOGIN_SUCCESS, req.lang);
      
      // Show success page with additional device info
      res.send(`
        <!DOCTYPE html>
        <html dir="${req.lang === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .success { 
              background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
              border-left: 5px solid #2ecc71; 
              padding: 25px; 
              border-radius: 10px; 
              margin-bottom: 30px;
            }
            .success h2 {
              color: #27ae60;
              margin-bottom: 15px;
              font-size: 28px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .info-section h3 {
              margin-top: 0;
              margin-bottom: 15px;
              color: #667eea;
              font-size: 18px;
            }
            .token { 
              background: #2c3e50; 
              color: #ecf0f1;
              padding: 20px; 
              border-radius: 8px; 
              word-break: break-all; 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              border: 2px solid #3498db;
              overflow-x: auto;
              margin: 15px 0;
            }
            .info-row {
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
              display: flex;
              justify-content: space-between;
              ${req.lang === 'ar' ? 'direction: rtl;' : ''}
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #2c3e50;
              min-width: 150px;
            }
            .value {
              color: #34495e;
              text-align: right;
              ${req.lang === 'ar' ? 'text-align: left;' : ''}
            }
            .warning {
              background: #fff3cd;
              border-left: 5px solid #ff9800;
              color: #856404;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 14px;
            }
            .warning strong {
              color: #ff9800;
            }
            .emoji {
              margin-right: 8px;
            }
            .button-group {
              margin-top: 30px;
              text-align: center;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2><span class="emoji">📘</span>${pageTitle}</h2>
            </div>

            <div class="info-section">
              <h3><span class="emoji">👤</span>User Information</h3>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${req.user.firstName} ${req.user.lastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${req.user.email}</span>
              </div>
              <div class="info-row">
                <span class="label">Username:</span>
                <span class="value">${req.user.username}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🖥️</span>Device Information</h3>
              <div class="info-row">
                <span class="label">Browser:</span>
                <span class="value">${loginEntry.browser.name} ${loginEntry.browser.version}</span>
              </div>
              <div class="info-row">
                <span class="label">Device Type:</span>
                <span class="value">${loginEntry.device.type}</span>
              </div>
              <div class="info-row">
                <span class="label">Operating System:</span>
                <span class="value">${loginEntry.os.name} ${loginEntry.os.version}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">📍</span>Login Location</h3>
              <div class="info-row">
                <span class="label">IP Address:</span>
                <span class="value">${loginEntry.ipAddress}</span>
              </div>
              <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${loginEntry.location.city}, ${loginEntry.location.region}, ${loginEntry.location.country}</span>
              </div>
              <div class="info-row">
                <span class="label">Timezone:</span>
                <span class="value">${loginEntry.location.timezone}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🔑</span>Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                <strong>⚠️ Important:</strong> Save this token securely. You'll need it for API authentication. Keep it confidential!
              </div>
            </div>

            <div class="button-group">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Back to App</a>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ 
        success: false, 
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message 
      });
    }
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    prompt: 'consent'
  })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: t(messages.OAUTH_AUTH_FAILED, req.lang)
        });
      }

      // Check if user is suspended
      if (!req.user.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: t(messages.ACCOUNT_SUSPENDED, req.lang) 
        });
      }

      // Create login history entry
      const loginEntry = await createLoginHistoryEntry(req, 'github', true);
      
      // Add login history to user
      if (!req.user.loginHistory) {
        req.user.loginHistory = [];
      }
      req.user.loginHistory.push(loginEntry);
      
      // Save user with login history
      await req.user.save();

      // Create welcome notification (only once)
      if (!req.user.hasWelcomeNotification) {
        await createNotification({
          userId: req.user._id,
          type: 'success',
          title: messages.WELCOME_TITLE,
          message: messages.WELCOME_MESSAGE,
          lang: req.lang,
          vars: { firstName: req.user.firstName }
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }
      
      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with language-based content
      const pageTitle = t(messages.OAUTH_LOGIN_SUCCESS, req.lang);
      
      // Show success page with additional device info
      res.send(`
        <!DOCTYPE html>
        <html dir="${req.lang === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 15px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .success { 
              background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
              border-left: 5px solid #2ecc71; 
              padding: 25px; 
              border-radius: 10px; 
              margin-bottom: 30px;
            }
            .success h2 {
              color: #27ae60;
              margin-bottom: 15px;
              font-size: 28px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .info-section h3 {
              margin-top: 0;
              margin-bottom: 15px;
              color: #667eea;
              font-size: 18px;
            }
            .token { 
              background: #2c3e50; 
              color: #ecf0f1;
              padding: 20px; 
              border-radius: 8px; 
              word-break: break-all; 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              border: 2px solid #3498db;
              overflow-x: auto;
              margin: 15px 0;
            }
            .info-row {
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
              display: flex;
              justify-content: space-between;
              ${req.lang === 'ar' ? 'direction: rtl;' : ''}
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #2c3e50;
              min-width: 150px;
            }
            .value {
              color: #34495e;
              text-align: right;
              ${req.lang === 'ar' ? 'text-align: left;' : ''}
            }
            .warning {
              background: #fff3cd;
              border-left: 5px solid #ff9800;
              color: #856404;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 14px;
            }
            .warning strong {
              color: #ff9800;
            }
            .emoji {
              margin-right: 8px;
            }
            .button-group {
              margin-top: 30px;
              text-align: center;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2><span class="emoji">🐙</span>${pageTitle}</h2>
            </div>

            <div class="info-section">
              <h3><span class="emoji">👤</span>User Information</h3>
              <div class="info-row">
                <span class="label">Name:</span>
                <span class="value">${req.user.firstName} ${req.user.lastName}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${req.user.email}</span>
              </div>
              <div class="info-row">
                <span class="label">Username:</span>
                <span class="value">${req.user.username}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🖥️</span>Device Information</h3>
              <div class="info-row">
                <span class="label">Browser:</span>
                <span class="value">${loginEntry.browser.name} ${loginEntry.browser.version}</span>
              </div>
              <div class="info-row">
                <span class="label">Device Type:</span>
                <span class="value">${loginEntry.device.type}</span>
              </div>
              <div class="info-row">
                <span class="label">Operating System:</span>
                <span class="value">${loginEntry.os.name} ${loginEntry.os.version}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">📍</span>Login Location</h3>
              <div class="info-row">
                <span class="label">IP Address:</span>
                <span class="value">${loginEntry.ipAddress}</span>
              </div>
              <div class="info-row">
                <span class="label">Location:</span>
                <span class="value">${loginEntry.location.city}, ${loginEntry.location.region}, ${loginEntry.location.country}</span>
              </div>
              <div class="info-row">
                <span class="label">Timezone:</span>
                <span class="value">${loginEntry.location.timezone}</span>
              </div>
            </div>

            <div class="info-section">
              <h3><span class="emoji">🔑</span>Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                <strong>⚠️ Important:</strong> Save this token securely. You'll need it for API authentication. Keep it confidential!
              </div>
            </div>

            <div class="button-group">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Back to App</a>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: t(messages.OAUTH_AUTH_FAILED, req.lang),
        error: error.message 
      });
    }
  }
);

// Complete profile for OAuth users
router.post('/complete-profile/:id', completeProfileCtrl);

module.exports = router;