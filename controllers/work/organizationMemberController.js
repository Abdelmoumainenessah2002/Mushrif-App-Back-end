const asyncHandler = require("express-async-handler");
const t = require("../../utils/t.utils");
const messages = require("../../constants/messages");
const { Organization } = require("../../models/work/Organization.model");
const {
  User,
  validateUserId,
  validateObjectId,
} = require("../../models/auth/User.model");
const {
  OrganizationMember,
  validateInviteUsers,
} = require("../../models/work/OrganizationMember.model");
const {
  OrganizationInvitation,
} = require("../../models/work/OrganizationInvitation.model");

const { notifyUser } = require("../../services/notifyUser.service");

const organizationInvitationEmailTemplate = require("../../emails/organizationInvitationEmailTemplate.template");
const {
  createOrganizationInvitation,
  acceptOrganizationInvitation,
  rejectOrganizationInvitation,
} = require("../../services/organizationInvitation.service");

const {
  isOrganizationAdmin,
  removeOrganizationMember,
} = require("../../services/organizationMember.service");


/**
 * @desc    Create a new organization member
 * @route   POST/api/organizations/:organizationId/members
 * @access  Private
 *
 */
module.exports.createOrganizationMemberCtrl = asyncHandler(async (req, res) => {
  // 1. Validate organization ID
  const { error: organizationIdError } = validateObjectId({
    id: req.params.organizationId,
  });

  if (organizationIdError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_ORGANIZATION_ID, req.lang),
    });
  }

  // 2. Validate user ID
  const { error: userIdError } = validateUserId({
    id: req.body.userId,
  });

  if (userIdError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_USER_ID, req.lang),
    });
  }

  // 3. Get organization
  const organization = await Organization.findOne({
    _id: req.params.organizationId,
    deletedAt: null,
    "settings.status": "ACTIVE",
  });

  if (!organization) {
    return res.status(404).json({
      success: false,
      message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
    });
  }

  // 4. Get user to add
  const user = await User.findById(req.body.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: t(messages.USER_NOT_FOUND, req.lang),
    });
  }

  // 5. Check if requester is a member of the organization
  const requesterMembership = await OrganizationMember.findOne({
    organizationId: organization._id,
    userId: req.user.id,
    status: "ACTIVE",
  });

  if (!requesterMembership) {
    return res.status(403).json({
      success: false,
      message: t(messages.NOT_ORGANIZATION_MEMBER, req.lang),
    });
  }

  // 6. Check permission
  if (
    requesterMembership.role !== "OWNER" &&
    requesterMembership.role !== "ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      message: t(messages.INSUFFICIENT_PERMISSIONS, req.lang),
    });
  }

  // 7. Check member invites setting
  if (
    requesterMembership.role === "ADMIN" &&
    organization.settings.allowMemberInvites === false
  ) {
    return res.status(403).json({
      success: false,
      message: t(messages.MEMBER_INVITES_DISABLED, req.lang),
    });
  }

  // 8. Prevent creating another OWNER
  if (req.body.role === "OWNER") {
    return res.status(403).json({
      success: false,
      message: t(messages.CANNOT_ASSIGN_OWNER_ROLE, req.lang),
    });
  }

  // 9. Check existing membership
  const existingMember = await OrganizationMember.findOne({
    organizationId: organization._id,
    userId: user._id,
  });

  if (existingMember) {
    // Already active/invited/suspended
    if (existingMember.status !== "REMOVED") {
      return res.status(409).json({
        success: false,
        message: t(messages.USER_ALREADY_ORGANIZATION_MEMBER, req.lang),
      });
    }

    // Re-invite removed member
    existingMember.role = req.body.role || "MEMBER";
    existingMember.status = "INVITED";
    existingMember.invitedBy = req.user.id;
    existingMember.joinedAt = null;

    await existingMember.save();

    return res.status(200).json({
      success: true,
      message: t(messages.ORGANIZATION_MEMBER_INVITED, req.lang),
      data: existingMember,
    });
  }

  // 10. Create member
  const organizationMember = new OrganizationMember({
    organizationId: organization._id,
    userId: user._id,
    role: req.body.role || "MEMBER",
    status: "INVITED",
    invitedBy: req.user.id,
    joinedAt: null,
  });

  try {
    await organizationMember.save();
  } catch (error) {
    // Duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: t(messages.USER_ALREADY_ORGANIZATION_MEMBER, req.lang),
      });
    }

    throw error;
  }

  return res.status(201).json({
    success: true,
    message: t(messages.ORGANIZATION_MEMBER_CREATED, req.lang),
    data: organizationMember,
  });
});

/**
 * @desc    Get all members of an organization
 * @route   GET/api/work/organizations/:organizationId/members
 * @access  Private (only members of the organization)
 */

module.exports.getOrganizationMembersCtrl = asyncHandler(async (req, res) => {
  // 1. Validate organization ID
  const { error: organizationIdError } = validateObjectId({
    id: req.params.organizationId,
  });

  if (organizationIdError) {
    return res.status(400).json({
      success: false,
      message: t(messages.INVALID_ORGANIZATION_ID, req.lang),
    });
  }

  // 2. Get organization
  const organization = await Organization.findOne({
    _id: req.params.organizationId,
    deletedAt: null,
    "settings.status": "ACTIVE",
  });

  if (!organization) {
    return res.status(404).json({
      success: false,
      message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
    });
  }

  // 3. Check if requester is a member of the organization
  const requesterMembership = await OrganizationMember.findOne({
    organizationId: organization._id,
    userId: req.user.id,
    status: "ACTIVE",
  });

  if (!requesterMembership) {
    return res.status(403).json({
      success: false,
      message: t(messages.NOT_ORGANIZATION_MEMBER, req.lang),
    });
  }

  // 4. Get all members of the organization and populate user details
  const members = await OrganizationMember.find({
    organizationId: organization._id,
  }).populate("userId", "name email");

  return res.status(200).json({
    success: true,
    message: t(messages.ORGANIZATION_MEMBERS_FETCHED, req.lang),
    data: members,
  });
});

/**
 * @desc invite users to an organization
 * @route POST /api/work/organizations/:organizationId/invite
 * @access Private (only admins or owners of the organization with appropriate permissions)
 */


module.exports.inviteUsersToOrganizationCtrl = asyncHandler(
  async (req, res) => {
    // 1. Validate organization ID
    const { error: organizationIdError } = validateObjectId({
      id: req.params.organizationId,
    });

    if (organizationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_ID, req.lang),
      });
    }

    // 2. Validate request body shape before reporting duplicate IDs separately.
    if (!Array.isArray(req.body?.userIds)) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_INVITE_DATA, req.lang),
      });
    }

    const inputUserIds = req.body.userIds.map((userId) =>
      typeof userId === "string" ? userId.trim() : userId,
    );
    const uniqueUserIds = [];
    const skippedUsers = [];
    const seenUserIds = new Set();

    for (const userId of inputUserIds) {
      if (seenUserIds.has(userId)) {
        skippedUsers.push({
          id: userId,
          reason: "DUPLICATE_USER_ID",
        });
        continue;
      }

      seenUserIds.add(userId);
      uniqueUserIds.push(userId);
    }

    const { error: inviteError } = validateInviteUsers({
      ...req.body,
      userIds: uniqueUserIds,
    });

    if (inviteError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_INVITE_DATA, req.lang),
      });
    }

    // 3. Get organization
    const organization = await Organization.findOne({
      _id: req.params.organizationId,
      deletedAt: null,
      "settings.status": "ACTIVE",
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
      });
    }

    // 4. Get requester membership
    const requesterMembership = await OrganizationMember.findOne({
      organizationId: organization._id,
      userId: req.user.id,
      status: "ACTIVE",
    });

    if (!requesterMembership) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang),
      });
    }

    // 5. Check requester permissions
    const isOwner = organization.ownerId.toString() === req.user.id.toString();

    const isAdmin = requesterMembership.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_AUTHORIZED, req.lang),
      });
    }

    // 6. Admin must respect allowMemberInvites
    if (isAdmin && organization.settings?.allowMemberInvites === false) {
      return res.status(403).json({
        success: false,
        message: t(messages.MEMBER_INVITES_DISABLED, req.lang),
      });
    }

    // 7. Get users
    const users = await User.find({
      _id: {
        $in: uniqueUserIds,
      },
      isDeleted: false,
      isActive: true,
    }).select("_id username firstName lastName email profilePhoto");

    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const memberships = await OrganizationMember.find({
      organizationId: organization._id,
      userId: { $in: users.map((user) => user._id) },
    }).select("userId status");
    const membershipsByUserId = new Map(
      memberships.map((membership) => [
        membership.userId.toString(),
        membership,
      ]),
    );
    const pendingInvitations = await OrganizationInvitation.find({
      organizationId: organization._id,
      invitedUserId: { $in: users.map((user) => user._id) },
      status: "PENDING",
    }).select("_id invitedUserId status");
    const pendingInvitationsByUserId = new Map(
      pendingInvitations.map((invitation) => [
        invitation.invitedUserId.toString(),
        invitation,
      ]),
    );

    const serializeUser = (user) => ({
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePhoto: user.profilePhoto,
    });
    const invitedUsers = [];
    const alreadyMembers = [];
    const suspendedMembers = [];
    const failedUsers = [];

    // 9. Process every requested user independently.
    for (const userId of uniqueUserIds) {
      const user = usersById.get(userId);

      if (!user) {
        skippedUsers.push({
          id: userId,
          reason: "USER_UNAVAILABLE",
        });
        continue;
      }

      const membership = membershipsByUserId.get(userId);

      if (membership?.status === "ACTIVE") {
        alreadyMembers.push(serializeUser(user));
        continue;
      }

      if (membership?.status === "SUSPENDED") {
        suspendedMembers.push(serializeUser(user));
        continue;
      }

      let replacedPendingInvitation = false;

      try {
        const pendingInvitation = pendingInvitationsByUserId.get(userId);

        if (pendingInvitation) {
          const cancelledInvitation =
            await OrganizationInvitation.findOneAndUpdate(
              {
                _id: pendingInvitation._id,
                organizationId: organization._id,
                status: "PENDING",
              },
              {
                $set: {
                  status: "CANCELLED",
                  cancelledAt: new Date(),
                },
              },
              { new: true },
            );

          if (!cancelledInvitation) {
            const latestInvitation = await OrganizationInvitation.findById(
              pendingInvitation._id,
            ).select("status");

            if (latestInvitation?.status === "PENDING") {
              failedUsers.push({
                ...serializeUser(user),
                reason: "PENDING_INVITATION_CONFLICT",
              });
              continue;
            }
          } else {
            replacedPendingInvitation = true;
          }
        }

        const invitation = await createOrganizationInvitation({
          organizationId: organization._id,
          invitedUserId: user._id,
          invitedBy: req.user.id,
          role: "MEMBER",
          expiresInDays: 7,
        });

        invitedUsers.push({
          user,
          invitation,
          replacedPendingInvitation,
        });
      } catch (error) {
        if (error.code === "INVITATION_ALREADY_EXISTS") {
          failedUsers.push({
            ...serializeUser(user),
            reason: "PENDING_INVITATION_CONFLICT",
          });
        } else {
          failedUsers.push({
            ...serializeUser(user),
            reason: replacedPendingInvitation
              ? "REINVITATION_CREATION_FAILED_AFTER_CANCELLATION"
              : "INVITATION_CREATION_FAILED",
          });
        }
      }
    }

    // 10. Notification preferences
    const notificationPreferences = organization.settings?.notifications;

    const shouldNotifyByEmail = notificationPreferences?.email === true;

    const shouldNotifyInApp = notificationPreferences?.inApp === true;

    // 11. Dispatch notifications
    //
    // Notification failure must NOT cancel
    // successfully created invitations.
    if (invitedUsers.length > 0) {
      invitedUsers.forEach(({ user, invitation }) => {
        const invitationUrl = `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/organizations/invitations/${invitation._id}`;

        notifyUser({
          userIds: [user._id],

          preferences: {
            email: shouldNotifyByEmail,
            inApp: shouldNotifyInApp,
          },

          // Email notification
          email: {
            subject: t(
              messages.ORGANIZATION_INVITATION_EMAIL_SUBJECT,
              req.lang,
            ),

            html: organizationInvitationEmailTemplate({
              firstName: user.firstName,
              organizationName: organization.name,
              invitationUrl,
              logoUrl: organization.logo?.url,
              role: invitation.role,
              expiresAt: invitation.expiresAt,
              lang: req.lang,
            }),
          },

          // In-app notification
          notification: {
            title: messages.ORGANIZATION_INVITATION_TITLE,

            message: messages.ORGANIZATION_INVITATION_MESSAGE,

            type: "info",
            priority: "medium",

            lang: req.lang,

            vars: {
              organizationName: organization.name,
            },
          },
        }).catch((notificationError) => {
          console.error(
            "[OrganizationInvitationController] Failed to dispatch invitation notification:",
            {
              userId: user._id,
              organizationId: organization._id,
              invitationId: invitation._id,
              error: notificationError.message,
            },
          );
        });
      });
    }

    // 12. Response
    return res.status(invitedUsers.length > 0 ? 201 : 200).json({
      success: invitedUsers.length > 0,
      message: t(messages.ORGANIZATION_USERS_INVITED, req.lang),
      data: {
        invitedUsers: invitedUsers.map(({ user, invitation }) => ({
          ...serializeUser(user),
          invitation: {
            id: invitation._id,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
        })),
        alreadyMembers,
        suspendedMembers,
        skippedUsers,
        failedUsers,
      },
    });
  },
);



/**
 * @desc    Accept organization invitation
 * @route   POST /api/work/organizations/invitations/:invitationId/accept
 * @access  Private
 */
module.exports.acceptOrganizationInvitationCtrl = asyncHandler(
  async (req, res) => {
    // 1. Validate invitation ID
    const { error: invitationIdError } = validateObjectId({
      id: req.params.invitationId,
    });

    if (invitationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_INVITATION_ID, req.lang),
      });
    }

    // 2. Validate authenticated user ID
    const { error: userIdError } = validateUserId({
      id: req.user.id,
    });

    if (userIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    try {
      // 3. Accept invitation
      const invitation = await acceptOrganizationInvitation({
        invitationId: req.params.invitationId,
        userId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: t(messages.ORGANIZATION_INVITATION_ACCEPTED, req.lang),
        data: {
          invitation,
        },
      });
    } catch (error) {
      // Invitation not found
      if (error.code === "INVITATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_NOT_FOUND, req.lang),
        });
      }

      // Invitation already accepted
      if (error.code === "INVITATION_ALREADY_ACCEPTED") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_ALREADY_ACCEPTED, req.lang),
        });
      }

      // Invitation already rejected
      if (error.code === "INVITATION_ALREADY_REJECTED") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_ALREADY_REJECTED, req.lang),
        });
      }

      // Invitation cancelled
      if (error.code === "INVITATION_CANCELLED") {
        return res.status(409).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_CANCELLED, req.lang),
        });
      }

      // Invitation expired
      if (error.code === "INVITATION_EXPIRED") {
        return res.status(409).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_EXPIRED, req.lang),
        });
      }

      // Concurrent modification conflict
      if (error.code === "INVITATION_CONFLICT") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_CONFLICT, req.lang),
        });
      }

      // User is already an active member
      if (error.code === "ALREADY_MEMBER") {
        return res.status(409).json({
          success: false,
          message: t(messages.USER_ALREADY_ORGANIZATION_MEMBER, req.lang),
        });
      }

      // User membership is suspended
      if (error.code === "MEMBERSHIP_SUSPENDED") {
        return res.status(409).json({
          success: false,
          message: t(messages.ORGANIZATION_MEMBERSHIP_SUSPENDED, req.lang),
        });
      }

      // Organization no longer exists or is not active
      if (error.code === "ORGANIZATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
        });
      }

      // Unknown/unexpected error
      throw error;
    }
  },
);


/**
 * @desc    Reject organization invitation
 * @route   POST /api/work/organizations/invitations/:invitationId/reject
 * @access  Private
 */


module.exports.rejectOrganizationInvitationCtrl = asyncHandler(
  async (req, res) => {
    // 1. Validate invitation ID
    const { error: invitationIdError } = validateObjectId({
      id: req.params.invitationId,
    });

    if (invitationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_INVITATION_ID, req.lang),
      });
    }

    // 2. Validate authenticated user ID
    const { error: userIdError } = validateUserId({
      id: req.user.id,
    });

    if (userIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    try {
      // 3. Reject invitation
      const invitation = await rejectOrganizationInvitation({
        invitationId: req.params.invitationId,
        userId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: t(messages.ORGANIZATION_INVITATION_REJECTED, req.lang),
        data: {
          invitation,
        },
      });
    } catch (error) {
      // Invitation not found
      if (error.code === "INVITATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_NOT_FOUND, req.lang),
        });
      }

      // Invitation already accepted
      if (error.code === "INVITATION_ALREADY_ACCEPTED") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_ALREADY_ACCEPTED, req.lang),
        });
      }

      // Invitation already rejected
      if (error.code === "INVITATION_ALREADY_REJECTED") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_ALREADY_REJECTED, req.lang),
        });
      }

      // Invitation cancelled
      if (error.code === "INVITATION_CANCELLED") {
        return res.status(409).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_CANCELLED, req.lang),
        });
      }

      // Invitation expired
      if (error.code === "INVITATION_EXPIRED") {
        return res.status(409).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_EXPIRED, req.lang),
        });
      }

      // Concurrent modification conflict
      if (error.code === "INVITATION_CONFLICT") {
        return res.status(409).json({
          success: false,
          message: t(messages.INVITATION_CONFLICT, req.lang),
        });
      }

      // Unexpected error
      throw error;
    }
  },
);

/**
 * @desc    Cancel a pending organization invitation
 * @route   PATCH /api/work/organizations/:organizationId/invitations/:invitationId/cancel
 * @access  Private (only active organization owners or admins)
 */
module.exports.cancelOrganizationInvitationCtrl = asyncHandler(
  async (req, res) => {
    const { error: organizationIdError } = validateObjectId({
      id: req.params.organizationId,
    });

    if (organizationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_ID, req.lang),
      });
    }

    const { error: invitationIdError } = validateObjectId({
      id: req.params.invitationId,
    });

    if (invitationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_INVITATION_ID, req.lang),
      });
    }

    const { error: userIdError } = validateUserId({ id: req.user.id });

    if (userIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    const access = await isOrganizationAdmin({
      organizationId: req.params.organizationId,
      userId: req.user.id,
    });

    if (!access.organizationAvailable) {
      return res.status(404).json({
        success: false,
        message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
      });
    }

    if (!access.isAdmin) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_ORGANIZATION_ADMIN, req.lang),
      });
    }

    const invitation = await OrganizationInvitation.findOneAndUpdate(
      {
        _id: req.params.invitationId,
        organizationId: req.params.organizationId,
        status: "PENDING",
      },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      },
      { new: true },
    );

    if (!invitation) {
      const existingInvitation = await OrganizationInvitation.findOne({
        _id: req.params.invitationId,
        organizationId: req.params.organizationId,
      }).select("status");

      if (!existingInvitation) {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_INVITATION_NOT_FOUND, req.lang),
        });
      }

      return res.status(409).json({
        success: false,
        message: t(messages.INVITATION_CANNOT_BE_CANCELLED, req.lang),
      });
    }

    return res.status(200).json({
      success: true,
      message: t(messages.ORGANIZATION_INVITATION_CANCELLED, req.lang),
    });
  },
);


/**
 * 
 */


/**
 * @desc    Remove a member from an organization
 * @route   DELETE /api/work/organizations/:organizationId/members/:memberId
 * @access  Private (only admins or owners of the organization with appropriate permissions)
 */

module.exports.removeOrganizationMemberCtrl = asyncHandler(
  async (req, res) => {
    // 1. Validate organization ID
    const { error: organizationIdError } = validateObjectId({
      id: req.params.organizationId,
    });

    if (organizationIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_ORGANIZATION_ID, req.lang),
      });
    }

    // 2. Validate member ID
    const { error: memberIdError } = validateUserId({
      id: req.params.memberId,
    });

    if (memberIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_MEMBER_ID, req.lang),
      });
    }

    // 3. Validate authenticated user ID
    const { error: userIdError } = validateUserId({
      id: req.user.id,
    });

    if (userIdError) {
      return res.status(400).json({
        success: false,
        message: t(messages.INVALID_USER_ID, req.lang),
      });
    }

    // 4. Check if the authenticated user is an admin or owner of the organization
    const access = await isOrganizationAdmin({
      organizationId: req.params.organizationId,
      userId: req.user.id,
    });

    if (!access.organizationAvailable) {
      return res.status(404).json({
        success: false,
        message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
      });
    }

    if (!access.isAdmin) {
      return res.status(403).json({
        success: false,
        message: t(messages.NOT_ORGANIZATION_ADMIN, req.lang),
      });
    }

    try {
      // 5. Remove member from organization
      const result = await removeOrganizationMember({
        organizationId: req.params.organizationId,
        memberId: req.params.memberId,
        requesterId: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message: t(messages.ORGANIZATION_MEMBER_REMOVED, req.lang),
        data: {
          result,
        },
      });
    } catch (error) {
      // Organization not found
      if (error.code === "ORGANIZATION_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_NOT_FOUND, req.lang),
        });
      }

      // Member not found
      if (error.code === "MEMBER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: t(messages.ORGANIZATION_MEMBER_NOT_FOUND, req.lang),
        });
      }

      // Cannot remove organization owner
      if (error.code === "CANNOT_REMOVE_OWNER") {
        return res.status(403).json({
          success: false,
          message: t(messages.CANNOT_REMOVE_OWNER, req.lang),
        });
      }

      // Insufficient permissions
      if (error.code === "INSUFFICIENT_PERMISSIONS") {
        return res.status(403).json({
          success: false,
          message: t(messages.INSUFFICIENT_PERMISSIONS, req.lang),
        });
      }

      // Not an admin
      if (error.code === "NOT_ORGANIZATION_ADMIN") {
        return res.status(403).json({
          success: false,
          message: t(messages.NOT_ORGANIZATION_ADMIN, req.lang),
        });
      }

      // Unexpected error
      throw error;
    }
  },
);
