const {
  Organization,
  validateCreateOrganization,
  validateModifyOrganizationSettings,
} = require("../../models/work/Organization.model");
const { User, validateUserId } = require("../../models/auth/User.model");
const OrganizationMember = require("../../models/work/OrganizationMember.model");
const t = require("../../utils/t.utils");
const messages = require("../../constants/messages");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const {
  cloudinaryUploadImage,
  cloudinaryRemoveImage,
} = require("../../services/cloudinary.service");

const {
  createOrganizationOwner,
  getUserOrganizations,
} = require("../../services/organizationMember.service");

const organizationCreatedEmailTemplate = require("../../emails/organizationCreatedEmail.template");
const {notifyUser} = require("../../services/notifyUser.service")

/**
 * @desc create new organization
 * @route  POST /api/work/organizations/
 * @access private (only loggedIn users)
 */


module.exports.createOrganizationCtrl = asyncHandler(async (req, res) => {
  // Validate user ID
  const { error: userIdError } = validateUserId({
    id: req.user.id,
  });

  if (userIdError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // Get user
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  /*
   * multipart/form-data sends nested objects as strings.
   *
   * Example:
   * req.body.settings =
   * '{"defaultLanguage":"ar","timeFormat":"24h",...}'
   *
   * Convert settings back to an object before Joi validation.
   */
  const organizationData = {
    ...req.body,
  };

  if (organizationData.settings) {
    try {
      organizationData.settings = JSON.parse(organizationData.settings);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_DATA, req.lang),
      });
    }
  }

  // Validate organization data
  const { error: organizationError, value } =
    validateCreateOrganization(organizationData);

  if (organizationError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_ORGANIZATION_DATA, req.lang),
    });
  }

  let uploadedImage = null;
  let session = null;

  try {
    /*
     * Create organization in memory.
     *
     * Mongoose generates _id immediately.
     * We use this _id for the Cloudinary folder.
     */
    const organization = new Organization({
      ...value,
      ownerId: user._id,
      createdBy: user._id,
    });

    /*
     * Upload image BEFORE starting the MongoDB transaction.
     *
     * This prevents keeping a MongoDB transaction open
     * while waiting for Cloudinary.
     */
    if (req.file) {
      uploadedImage = await cloudinaryUploadImage(req.file.buffer, {
        folder: `Mushrif/organizations/${organization._id}`,
        public_id: "logo",
        overwrite: false,
      });

      organization.logo = {
        url: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
      };
    }

    /*
     * Start MongoDB transaction only after Cloudinary succeeds.
     */
    session = await mongoose.startSession();

    session.startTransaction();

    // Create organization
    await organization.save({ session });

    // Create owner member
    const organizationMember = await createOrganizationOwner({
      organizationId: organization._id,
      userId: user._id,
      session,
    });

    // Commit transaction
    await session.commitTransaction();

    /*
     * ========================================================================
     * Background Notifications
     * ========================================================================
     *
     * The organization and owner membership are already committed.
     *
     * notifyUser() dispatches Email and/or In-App notification jobs
     * according to the organization's notification preferences.
     *
     * We intentionally DO NOT await this call.
     *
     * If Redis/BullMQ is unavailable, organization creation still succeeds.
     */
    const notificationPreferences =
      organization.settings?.notifications;

    const shouldNotifyByEmail =
      notificationPreferences?.email === true;

    const shouldNotifyInApp =
      notificationPreferences?.inApp === true;

    if (shouldNotifyByEmail || shouldNotifyInApp) {
      const organizationUrl = `${
        process.env.CLIENT_URL || "http://localhost:3000"
      }/organizations/${organization._id}`;

      const organizationEmailHtml = organizationCreatedEmailTemplate({
        firstName: user.firstName,
        organizationName: organization.name,
        logoUrl: `${
          process.env.SERVER_URL || "http://localhost:8000"
        }/public/images/logo.png`,
        organizationUrl,
        lang: req.lang,
      });

      /*
       * Dispatch notification jobs in the background.
       *
       * We do not await the Promise because notification delivery
       * must never block the organization creation response.
       */
      notifyUser({
        userIds: [user._id],

        preferences: {
          email: shouldNotifyByEmail,
          inApp: shouldNotifyInApp,
        },

        email: {
          subject: t(messages.ORGANIZATION_CREATED_TITLE, req.lang),
          html: organizationEmailHtml,
        },

        notification: {
          title: messages.ORGANIZATION_CREATED_TITLE,
          message: messages.ORGANIZATION_CREATED_MESSAGE,
          type: "success",
          priority: "medium",
          vars: {
            organizationName: organization.name,
          },
        },
      }).catch((notificationError) => {
        console.error(
          "[OrganizationController] Failed to dispatch organization notifications:",
          notificationError.message,
        );
      });
    }

    return res.status(201).json({
      success: true,
      message: t(messages.ORGANIZATION_CREATED, req.lang),
      data: {
        organization,
        membership: organizationMember,
      },
    });
  } catch (error) {
    /*
     * Abort MongoDB transaction if it was started.
     */
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    /*
     * If Cloudinary upload succeeded but MongoDB failed,
     * remove the uploaded image to avoid orphaned files.
     */
    if (uploadedImage?.public_id) {
      try {
        await cloudinaryRemoveImage(uploadedImage.public_id);
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup organization image after creation failure:",
          {
            publicId: uploadedImage.public_id,
            error: cleanupError,
          },
        );
      }
    }

    // Duplicate organization slug
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: t(
          messages.ORGANIZATION_SLUG_ALREADY_EXISTS,
          req.lang,
        ),
      });
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});





/**
 * @desc   modify organization settings
 * @route  PATCH /api/work/organizations/:organizationId/settings
 * @access private (only organization Owner or Admin)
 */
module.exports.modifyOrganizationSettingsCtrl = asyncHandler(
  async (req, res) => {
    // 1. Validate user ID
    const { error: userIdError } = validateUserId({
      id: req.user.id,
    });

    if (userIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    // 2. Get organization ID strictly from req.params.organizationId
    const { organizationId } = req.params;

    // 3. Validate that organizationId is a valid MongoDB ObjectId
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_DATA, req.lang),
      });
    }

    // 4. Validate settings payload using validateModifyOrganizationSettings from Organization.model.js
    const { error, value } = validateModifyOrganizationSettings(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_DATA, req.lang),
      });
    }

    // 5. Find organization
    const organization = await Organization.findOne({
      _id: organizationId,
      deletedAt: null,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: t(
          messages.ORGANIZATION_NOT_FOUND,
          req.lang,
        ),
      });
    }

    // 6. Check authorization: only Owner or ACTIVE ADMIN
    const isOwner = organization.ownerId.toString() === req.user.id.toString();
    let isAdmin = false;

    if (!isOwner) {
      const adminMembership = await OrganizationMember.findOne({
        organizationId: organization._id,
        userId: req.user.id,
        status: "ACTIVE",
        role: "ADMIN",
      });

      if (adminMembership) {
        isAdmin = true;
      }
    }

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang),
      });
    }

    // 7. Apply partial updates to settings using validated Joi value
    if (!organization.settings) {
      organization.settings = {};
    }

    if (value.defaultLanguage !== undefined) {
      organization.settings.defaultLanguage = value.defaultLanguage;
    }
    if (value.defaultTimezone !== undefined) {
      organization.settings.defaultTimezone = value.defaultTimezone;
    }
    if (value.dateFormat !== undefined) {
      organization.settings.dateFormat = value.dateFormat;
    }
    if (value.timeFormat !== undefined) {
      organization.settings.timeFormat = value.timeFormat;
    }
    if (value.weekStartsOn !== undefined) {
      organization.settings.weekStartsOn = value.weekStartsOn;
    }
    if (value.defaultProjectView !== undefined) {
      organization.settings.defaultProjectView = value.defaultProjectView;
    }
    if (value.status !== undefined) {
      organization.settings.status = value.status;
    }
    if (value.allowMemberInvites !== undefined) {
      organization.settings.allowMemberInvites = value.allowMemberInvites;
    }
    if (value.allowGuestUsers !== undefined) {
      organization.settings.allowGuestUsers = value.allowGuestUsers;
    }

    if (value.notifications) {
      if (!organization.settings.notifications) {
        organization.settings.notifications = {};
      }
      if (value.notifications.email !== undefined) {
        organization.settings.notifications.email = value.notifications.email;
      }
      if (value.notifications.inApp !== undefined) {
        organization.settings.notifications.inApp = value.notifications.inApp;
      }
    }

    // 8. Save updated organization
    await organization.save();

    return res.status(200).json({
      success: true,
      message: t(
        messages.ORGANIZATION_SETTINGS_UPDATED ||
          "ORGANIZATION_SETTINGS_UPDATED",
        req.lang,
      ),
      data: {
        organization,
      },
    });
  },
);


/**
 * @desc    Get my organizations
 * @route   GET /api/work/organizations
 * @access  Private (only loggedIn users)
 */
module.exports.getMyOrganizationsCtrl = asyncHandler(async (req, res) => {
  // 1. Validate authenticated user ID
  const { error: userIdError } = validateUserId({ id: req.user.id });
  if (userIdError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // 2. Verify user exists and is active
  const user = await User.findById(req.user.id);
  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  if (user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: t(messages.ACCOUNT_SUSPENDED, req.lang),
    });
  }

  // 3. Fetch user's active organizations with roles and selection details
  const organizations = await getUserOrganizations({
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: t(messages.USER_ORGANIZATIONS_FETCHED, req.lang, {
      count: organizations.length,
    }),
    data: {
      organizations,
      count: organizations.length,
    },
  });
});

