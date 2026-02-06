
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
 * @desc    Request email verification link (for users registered with email & password)
 * @method  Post
 * @route   /api/user/:id/verify-email
 * @access  Private (Only the user themselves)
 */

module.exports.verifyUserByEmailCtrl = asyncHandler(async (req, res) => {

  // check the validation of the user ID
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

  // if user is already verified, no need to send another email
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: t(messages.EMAIL_ALREADY_VERIFIED, req.lang)
    });
  }

  // send verification email
  const token = await createVerificationToken(
      user._id,
      'VERIFY_EMAIL',
      15
    );

  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;

  const html = verifyEmailTemplate({
    verificationLink,
    logoUrl: `${process.env.API_URL}/public/images/logo.png`,
    lang: req.lang
  });

  await sendEmail({
    to: user.email,
    subject: t(messages.VERIFY_EMAIL_SENT, req.lang),
    html
  });

  res.status(200).json({
    success: true,
    message: t(messages.VERIFY_EMAIL_SENT, req.lang)
  });

});


/**
 * @desc Validate verification token and verify user's email
 * @route /api/users/validate-email/:token
 * @method GET
 * @access Public
 */
module.exports.validateVerificationTokenAndUpdateUserCtrl = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const exists = await VerificationToken.findOne({
    token,
    type: 'VERIFY_EMAIL'
  });

  if (!exists) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  const userId = exists.userId;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_OR_EXPIRED_TOKEN, req.lang)
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang)
    });
  }

  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: t(messages.EMAIL_VERIFIED, req.lang)
  });

  // delete the token after successful verification
  await VerificationToken.deleteOne({ _id: exists._id });

});