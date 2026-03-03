const express = require('express');
const router = express.Router();

const {
  updateUserProfileCtrl,
  updateUserProfilePhotoCtrl,
  suspendUserAccountCtrl,
  unsuspendUserAccountCtrl
} = require('../controllers/userController');

const { uploadSingleImage } = require('../middlewares/upload.middleware');
const { verifyTokenAndAdmin, verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');


// update user profile
router.patch('/:id/profile',verifyTokenAndOnlyUser, updateUserProfileCtrl);

// update user profile photo
router.patch(
  '/:id/profile-photo',
  verifyTokenAndOnlyUser,
  uploadSingleImage,
  updateUserProfilePhotoCtrl
);

// suspended and unsuspended routes for admin
router.put('/suspend/:id', verifyTokenAndAdmin, suspendUserAccountCtrl);
router.put('/unsuspend/:id', verifyTokenAndAdmin, unsuspendUserAccountCtrl);

module.exports = router;
