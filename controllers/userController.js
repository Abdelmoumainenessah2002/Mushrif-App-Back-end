
const { User, validateUserProfileUpdate, validateUserId} = require("../models/User");
const t = require("../utils/t");
const messages = require("../constants/messages");
const {
  cloudinaryUploadImage,
  cloudinaryRemoveImage
} = require('../services/cloudinary.service');
const createVerificationToken = require('../services/verificationToken.service');
const asyncHandler = require("express-async-handler");
const sendEmail = require("../services/email.service");
const verifyEmailTemplate = require("../emails/verifyEmail.template");
const VerificationToken = require('../models/VerificationToken');


/**
 * @desc    update user profile
 * @method  Put
 * @route   /api/user/:id/profile
 * @access  Private (Only the user themselves)
 */

module.exports.updateUserProfileCtrl = asyncHandler(async (req, res) => {
  const userId = req.params.id;
    const { username, firstName, lastName, phoneNumber, bio, socialMedia } = req.body;

    // validate user ID
    const { error } = validateUserId({ id: userId });
    if (error) {
      return res.status(400).json({
          success: false,
          message: t(messages.INVALID_USER_ID, req.lang) 
      });
    }
    // validate New Data 

    const { error2 } = validateUserProfileUpdate(req.body);
    if (error2) {
      return res.status(400).json({
        success: false,
        message: t(messages.VALIDATION_ERROR, req.lang)
      });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: t(messages.USER_NOT_FOUND, req.lang)
        });
    }

    // Update user fields
    if (username) user.username = username;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio) user.bio = bio;
    if (socialMedia) user.socialMedia = socialMedia;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    // Save the updated user
    await user.save();
    res.status(200).json({
      success: true,
      message: t(messages.PROFILE_UPDATED, req.lang),
        data: {
            user
        }
    });
});


/**
 * @desc    update user profile photo
 * @method  Put
 * @route   /api/user/:id/profile-photo
 * @access  Private (Only the user themselves)
 */

module.exports.updateUserProfilePhotoCtrl = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const { error } = validateUserId({ id: userId });
  if (error) {
    return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang) 
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: t(messages.NO_IMAGE_PROVIDED, req.lang)
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // delete old image if exists
  if (user.profilePhoto?.publicId) {
    try {
      await cloudinaryRemoveImage(user.profilePhoto.publicId);
    } catch (error) {
      const messageKey = error.messageKey || messages.CLOUDINARY_DELETE_ERROR;
      return res.status(500).json({
        success: false,
        message: t(messageKey, req.lang)
      });
    }
  }

  // upload new image
  const uploadResult = await cloudinaryUploadImage(
    req.file.buffer,
    { folder: `Mushrif/users/profilePhotos/${userId}` }
  );

  // update mongodb
  user.profilePhoto = {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: t(messages.PROFILE_PHOTO_UPDATED, req.lang),
    data: {
      profilePhoto: user.profilePhoto
    }
  });
});






/**
 * @desc suspend user account (for admin use only)
 * @route /api/users/suspend/:id
 * @method PUT
 * @access Private (Admin only)
 */


module.exports.suspendUserAccountCtrl = asyncHandler(async (req, res) => {

  // validate user ID
  const { error } = validateUserId({ id: req.params.id });

  if (error) {
    return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang)
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)

    });
  }

  console.log("User role:", user.role[0]);

  // check if the role of the user is super admin, if yes, prevent suspension
  if (user.role.includes('super_admin')) {
    return res.status(403).json({
      success: false,
      message: t(messages.CANNOT_SUSPEND_THIS_USER, req.lang)
    });
  }

  // check if user is already suspended
  if (!user.isActive) {
    return res.status(400).json({
      success: false,
      message: t(messages.USER_ALREADY_SUSPENDED, req.lang)
    });
  }


  // suspend the user
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: t(messages.USER_SUSPENDED, req.lang)
  });
});


/**
 * @desc Unsuspend user account (for admin use only)
 * @route /api/users/unsuspend/:id
 * @method PUT
 * @access Private (Admin only)
 */

module.exports.unsuspendUserAccountCtrl = asyncHandler(async (req, res) => {

  // validate user ID
  const { error } = validateUserId({ id: req.params.id });
  if (error) {
    return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang)
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  // check if the role of the user is super admin, if yes, prevent suspension
  if (user.role === 'super_admin') {
    return res.status(403).json({
      success: false,
      message: t(messages.CANNOT_UNSUSPEND_THIS_USER, req.lang)
    });
  }

  // check if user is already active  
  if (user.isActive) {
    return res.status(400).json({
      success: false,
      message: t(messages.USER_ALREADY_UNSUSPENDED, req.lang)
    });
  }

  // unsuspend the user
  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: t(messages.USER_UNSUSPENDED, req.lang)
  });

});