const multer = require("multer");

const messages = require("../constants/messages");
const t = require("../utils/t.utils");

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    const error = new Error(t(messages.ONLY_IMAGES_ALLOWED, req.lang || "en"));

    error.messageKey = messages.ONLY_IMAGES_ALLOWED;

    return cb(error, false);
  }

  cb(null, true);
};

const imageUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter: imageFileFilter,
});

/**
 * Upload one image.
 *
 * The field name is decided by the route.
 *
 * Example:
 * uploadSingleImage("logo")
 * uploadSingleImage("profilePhoto")
 */
const uploadSingleImage = (fieldName) => {
  return (req, res, next) => {
    imageUpload.single(fieldName)(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: t(messages.FILE_TOO_LARGE, req.lang || "en"),
        });
      }

      if (err.messageKey) {
        return res.status(400).json({
          success: false,
          message: t(err.messageKey, req.lang || "en"),
        });
      }

      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_FILE, req.lang || "en"),
      });
    });
  };
};

module.exports = {
  uploadSingleImage,
};
