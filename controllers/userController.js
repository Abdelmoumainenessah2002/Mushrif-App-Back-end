const {
  User,
  validateUserProfileUpdate,
  validateUserId,
  validateEmail,
} = require("../models/auth/User.model");
const t = require("../utils/t.utils");
const messages = require("../constants/messages");
const {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
} = require("../services/cloudinary.service");
const createVerificationToken = require("../services/verificationToken.service");
const asyncHandler = require("express-async-handler");
const sendEmail = require("../services/email.service");
const VerificationToken = require("../models/auth/VerificationToken.model");

const { validateAndNormalizePhoneNumber } = require("../utils/phoneUtils.utils");

/**
 * @desc    update user profile
 * @method  Put
 * @route   /api/user/:id/profile
 * @access  Private (Only the user themselves)
 */

module.exports.updateUserProfileCtrl = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { username, firstName, lastName, phoneNumber, bio, socialMedia } =
    req.body;

  // validate user ID
  const { error } = validateUserId({ id: userId });
  if (error) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }
  // validate New Data

  const { error2 } = validateUserProfileUpdate(req.body);
  if (error2) {
    return res.status(400).json({
      success: false,
      message: t(messages.VALIDATION_ERROR, req.lang),
    });
  }

  // Find the user by ID
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // Update user fields
  if (username) user.username = username;
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (bio) user.bio = bio;
  if (socialMedia) user.socialMedia = socialMedia;

  // Save the updated user
  await user.save();
  res.status(200).json({
    success: true,
    message: t(messages.PROFILE_UPDATED, req.lang),
    data: {
      user,
    },
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
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: t(messages.NO_IMAGE_PROVIDED, req.lang),
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
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
        message: t(messageKey, req.lang),
      });
    }
  }

  // upload new image
  const uploadResult = await cloudinaryUploadImage(req.file.buffer, {
    folder: `Mushrif/users/profilePhotos/${userId}`,
  });

  // update mongodb
  user.profilePhoto = {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: t(messages.PROFILE_PHOTO_UPDATED, req.lang),
    data: {
      profilePhoto: user.profilePhoto,
    },
  });
});


/**
 * @desc    Resolve user by email, username, UID, or phone number
 * @method  POST
 * @route   /api/user/resolve
 * @access  Private
 */
module.exports.resolveUserCtrl = asyncHandler(async (req, res) => {
  // 1. Validate that exactly one identifier was provided
  const { email, username, uid, phoneNumber } = req.body;

  const identifiers = [
    email !== undefined,
    username !== undefined,
    uid !== undefined,
    phoneNumber !== undefined,
  ].filter(Boolean);

  if (identifiers.length !== 1) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_IDENTIFIER, req.lang),
    });
  }

  // 2. Build the query according to the identifier type
  let query = {};

  if (email !== undefined) {
    const { error } = validateEmail({ email });

    if (error) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_EMAIL, req.lang),
      });
    }

    query.email = email.trim().toLowerCase();
  }

  if (username !== undefined) {
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USERNAME, req.lang),
      });
    }

    query.username = username.trim();
  }

  if (uid !== undefined) {
    if (typeof uid !== "string" || !/^[A-Z0-9]{10}$/.test(uid.trim())) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_UID, req.lang),
      });
    }

    query.uid = uid.trim();
  }

  if (phoneNumber !== undefined) {
    const phoneValidation =
      validateAndNormalizePhoneNumber(phoneNumber);

    if (phoneValidation.error) {
      return res.status(400).json({
        success: false,
        message: t(
          messages[phoneValidation.error] || messages.INVALID_PHONE_NUMBER,
          req.lang,
        ),
      });
    }

    query["phoneNumber.fullNumber"] =
      phoneValidation.value.fullNumber;
  }

  // 3. Find user
  const user = await User.findOne({
    ...query,
    isDeleted: false,
  }).select(
    "_id username firstName lastName email profilePhoto",
  );

  // 4. User not found
  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // 5. Return user information
  return res.status(200).json({
    success: true,
    message: t(messages.USER_FOUND, req.lang),
    data: {
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    },
  });
});