const express = require('express');
const router = express.Router();

const {
  updateUserProfileCtrl,
  updateUserProfilePhotoCtrl,
  verifyUserByEmailCtrl,
  validateEmailVerificationTokenCtrl,
  verifyEmailAndUpdateUserCtrl,
  suspendUserAccountCtrl,
  unsuspendUserAccountCtrl
} = require('../controllers/userController');


const { uploadSingleImage } = require('../middlewares/upload.middleware');
const { verifyTokenAndAdmin, verifyTokenAndOnlyUser } = require('../middlewares/verifyJWTToken.middleware');

router.patch('/:id/profile',verifyTokenAndOnlyUser, updateUserProfileCtrl);

router.patch(
  '/:id/profile-photo',
  verifyTokenAndOnlyUser,
  uploadSingleImage,
  updateUserProfilePhotoCtrl
);

router.post('/:id/verify-email', verifyTokenAndOnlyUser, verifyUserByEmailCtrl);
router.get('/validate-email/:token', validateEmailVerificationTokenCtrl);
router.post('/verify-email', verifyEmailAndUpdateUserCtrl);

// suspended and unsuspended routes for admin
router.put('/suspend/:id', verifyTokenAndAdmin, suspendUserAccountCtrl);
router.put('/unsuspend/:id', verifyTokenAndAdmin, unsuspendUserAccountCtrl);

module.exports = router;
