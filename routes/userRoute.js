const express = require('express');
const router = express.Router();

const {
  updateUserProfileCtrl,
  updateUserProfilePhotoCtrl,
  resolveUserCtrl,
} = require("../controllers/userController");

const { uploadSingleImage } = require('../middlewares/upload.middleware');
const { verifyTokenAndAdmin, verifyToken, verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');


// update user profile
router.patch('/:id/profile',verifyTokenAndOnlyUser, updateUserProfileCtrl);

// update user profile photo
router.patch(
  '/:id/profile-photo',
  verifyTokenAndOnlyUser,
  uploadSingleImage,
  updateUserProfilePhotoCtrl
);

// get user info
router.get("/:id", verifyToken, resolveUserCtrl);

module.exports = router;
