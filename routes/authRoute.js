const router = require('express').Router();
const passport = require('../config/passport');
const { 
  registerUserCtrl, 
  completeProfileCtrl, 
  loginUserCtrl
} = require('../controllers/authController');
const { createLoginHistoryEntry } = require('../utils/loginHistoryHelper');
const { createNotification } = require('../services/notification.service');



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
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
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
          title: 'Welcome to Mushrif!',
          message: `Hello ${req.user.firstName}, welcome to Mushrif! We're excited to have you on board. Explore our features and let us know if you need any assistance. Happy exploring!`
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }


      
      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with additional device info
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 700px; 
              margin: 50px auto; 
              padding: 20px; 
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { 
              background: #d4edda; 
              border: 1px solid #c3e6cb; 
              padding: 20px; 
              border-radius: 5px; 
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .info-section h3 {
              margin-top: 0;
              color: #495057;
            }
            .token { 
              background: #fff3cd; 
              padding: 15px; 
              border-radius: 5px; 
              word-break: break-all; 
              font-family: monospace;
              font-size: 12px;
              border: 1px solid #ffc107;
            }
            .info-row {
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #495057;
              display: inline-block;
              width: 120px;
            }
            .value {
              color: #212529;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 10px;
              border-radius: 5px;
              margin-top: 15px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2>🎉 Google OAuth Successful!</h2>
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
              <h3>🖥️ Device Information</h3>
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
              <h3>📍 Login Location</h3>
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
              <h3>🔑 Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                ⚠️ <strong>Important:</strong> Save this token securely. You'll need it for API authentication.
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
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
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
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
          title: 'Welcome to Mushrif!',
          message: `Hello ${req.user.firstName}, welcome to Mushrif! We're excited to have you on board. Explore our features and let us know if you need any assistance. Happy exploring!`
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }
      
      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with additional device info
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 700px; 
              margin: 50px auto; 
              padding: 20px; 
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { 
              background: #d4edda; 
              border: 1px solid #c3e6cb; 
              padding: 20px; 
              border-radius: 5px; 
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .info-section h3 {
              margin-top: 0;
              color: #495057;
            }
            .token { 
              background: #fff3cd; 
              padding: 15px; 
              border-radius: 5px; 
              word-break: break-all; 
              font-family: monospace;
              font-size: 12px;
              border: 1px solid #ffc107;
            }
            .info-row {
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #495057;
              display: inline-block;
              width: 120px;
            }
            .value {
              color: #212529;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 10px;
              border-radius: 5px;
              margin-top: 15px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2>📘 Facebook OAuth Successful!</h2>
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
              <h3>🖥️ Device Information</h3>
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
              <h3>📍 Login Location</h3>
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
              <h3>🔑 Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                ⚠️ <strong>Important:</strong> Save this token securely. You'll need it for API authentication.
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
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
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
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
          title: 'Welcome to Mushrif!',
          message: `Hello ${req.user.firstName}, welcome to Mushrif! We're excited to have you on board. Explore our features and let us know if you need any assistance. Happy exploring!`
        });

        req.user.hasWelcomeNotification = true;
        await req.user.save();
      }
      
      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page with additional device info
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 700px; 
              margin: 50px auto; 
              padding: 20px; 
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { 
              background: #d4edda; 
              border: 1px solid #c3e6cb; 
              padding: 20px; 
              border-radius: 5px; 
              margin-bottom: 20px;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .info-section h3 {
              margin-top: 0;
              color: #495057;
            }
            .token { 
              background: #fff3cd; 
              padding: 15px; 
              border-radius: 5px; 
              word-break: break-all; 
              font-family: monospace;
              font-size: 12px;
              border: 1px solid #ffc107;
            }
            .info-row {
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #495057;
              display: inline-block;
              width: 120px;
            }
            .value {
              color: #212529;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 10px;
              border-radius: 5px;
              margin-top: 15px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">
              <h2>🐙 GitHub OAuth Successful!</h2>
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
              <h3>🖥️ Device Information</h3>
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
              <h3>📍 Login Location</h3>
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
              <h3>🔑 Your JWT Token</h3>
              <div class="token">${token}</div>
              <div class="warning">
                ⚠️ <strong>Important:</strong> Save this token securely. You'll need it for API authentication.
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      });
    }
  }
);

// Complete profile for OAuth users
router.post('/complete-profile/:id', completeProfileCtrl);

module.exports = router;