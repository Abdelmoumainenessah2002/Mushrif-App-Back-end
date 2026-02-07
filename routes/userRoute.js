const express = require('express');
const router = express.Router();

const {
  updateUserProfileCtrl,
  updateUserProfilePhotoCtrl,
  verifyUserByEmailCtrl,
  validateVerificationTokenAndUpdateUserCtrl,
  suspendUserAccountCtrl,
  unsuspendUserAccountCtrl
} = require('../controllers/userController');


const { uploadSingleImage } = require('../middlewares/upload.middleware');

router.patch('/:id/profile', updateUserProfileCtrl);

router.patch(
  '/:id/profile-photo',
  uploadSingleImage,
  updateUserProfilePhotoCtrl
);

router.post('/:id/verify-email', verifyUserByEmailCtrl);
router.get('/validate-email/:token', validateVerificationTokenAndUpdateUserCtrl);

// suspended and unsuspended routes for admin
router.put('/suspend/:id', suspendUserAccountCtrl);
router.put('/unsuspend/:id', unsuspendUserAccountCtrl);

module.exports = router;
