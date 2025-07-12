const router = require('express').Router();
const passport = require('../config/passport');
const { 
  registerUserCtrl, 
  completeProfileCtrl, 
  loginUserCtrl
} = require('../controllers/authController');

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
  (req, res) => {
    try {
      if (!req.user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
        });
      }

      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
            .token { background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>🎉 Google OAuth Successful!</h2>
            <p><strong>Welcome:</strong> ${req.user.firstName} ${req.user.lastName}</p>
            <p><strong>Email:</strong> ${req.user.email}</p>
            <p><strong>Username:</strong> ${req.user.username}</p>
            <h3>Your JWT Token:</h3>
            <div class="token">${token}</div>
            <p><small>Save this token for API authentication</small></p>
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
  (req, res) => {
    try {
      if (!req.user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
        });
      }

      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Facebook Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
            .facebook { background: #4267B2; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .token { background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="facebook">
            <h2>📘 Facebook OAuth Successful!</h2>
          </div>
          <div class="success">
            <p><strong>Welcome:</strong> ${req.user.firstName} ${req.user.lastName}</p>
            <p><strong>Email:</strong> ${req.user.email}</p>
            <p><strong>Username:</strong> ${req.user.username}</p>
            <h3>Your JWT Token:</h3>
            <div class="token">${token}</div>
            <p><small>Save this token for API authentication</small></p>
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
  (req, res) => {
    try {
      if (!req.user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Authentication failed' 
        });
      }

      // Generate JWT token
      const token = req.user.generateAuthToken();
      
      // Show success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GitHub Authentication Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; }
            .github { background: #24292e; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .token { background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="github">
            <h2>🐙 GitHub OAuth Successful!</h2>
          </div>
          <div class="success">
            <p><strong>Welcome:</strong> ${req.user.firstName} ${req.user.lastName}</p>
            <p><strong>Email:</strong> ${req.user.email}</p>
            <p><strong>Username:</strong> ${req.user.username}</p>
            <h3>Your JWT Token:</h3>
            <div class="token">${token}</div>
            <p><small>Save this token for API authentication</small></p>
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