const multer = require('multer');
const messages = require('../constants/messages');
const t = require('../utils/t.utils');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20mb
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      // Store error in request to use language from middleware
      const error = new Error(t(messages.ONLY_IMAGES_ALLOWED, req.lang || 'en'));
      error.messageKey = messages.ONLY_IMAGES_ALLOWED;
      cb(error, false);
    } else {
      cb(null, true);
    }
  }
});

// Custom error handler for multer
const uploadSingleImageWithErrorHandler = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 400 : 400;
      const messageKey = err.code === 'LIMIT_FILE_SIZE' 
        ? messages.FILE_TOO_LARGE 
        : (err.messageKey || messages.ONLY_IMAGES_ALLOWED);
      
      return res.status(statusCode).json({
        success: false,
        message: t(messageKey, req.lang || 'en')
      });
    }
    next();
  });
};

module.exports = {
  uploadSingleImage: uploadSingleImageWithErrorHandler
};
