const express = require('express');
const router = express.Router();

const {
  updateUserProfileCtrl,
  updateUserProfilePhotoCtrl
} = require('../controllers/userController');

const { uploadSingleImage } = require('../middlewares/upload.middleware');

router.patch('/:id/profile', updateUserProfileCtrl);

router.patch(
  '/:id/profile-photo',
  uploadSingleImage,
  updateUserProfilePhotoCtrl
);

module.exports = router;
