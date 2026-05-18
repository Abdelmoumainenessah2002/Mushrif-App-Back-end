
const { User, validateUserId} = require("../models/User");
const t = require("../utils/t");
const messages = require("../constants/messages");

const asyncHandler = require("express-async-handler");








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


  // admin can't suspend themselves
    if (user._id.toString() === req.user.id.toString()) {
        return res.status(403).json({
            success: false,
            message: t(messages.CANNOT_SUSPEND_SELF, req.lang)
        });
    }


    // admin can't suspend other admins unless they are super admins
    if (user.role.includes('admin') && !req.user.role.includes('super_admin')) {
        return res.status(403).json({
            success: false,
            message: t(messages.CANNOT_SUSPEND_THIS_USER, req.lang)
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

  // check if user is admin and the requester is not super admin, prevent unsuspension
    if (user.role.includes('admin') && !req.user.role.includes('super_admin')) {
        return res.status(403).json({
            success: false,
            message: t(messages.CANNOT_UNSUSPEND_THIS_USER, req.lang)
        });
    }

  // admin can't unsuspend themselves
    if (user._id.toString() === req.user.id.toString()) {
        return res.status(403).json({
            success: false,
            message: t(messages.CANNOT_UNSUSPEND_THIS_USER, req.lang)
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