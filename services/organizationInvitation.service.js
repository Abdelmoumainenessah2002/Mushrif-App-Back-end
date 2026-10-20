const mongoose = require("mongoose");

const {
  OrganizationInvitation,
} = require("../models/work/OrganizationInvitation.model");

const {
  OrganizationMember,
} = require("../models/work/OrganizationMember.model");

const { Organization } = require("../models/work/Organization.model");

/**
 * Create organization invitation
 *
 * Creates a PENDING invitation.
 * The invited user does NOT become a member yet.
 */
const createOrganizationInvitation = async ({
  organizationId,
  invitedUserId,
  invitedBy,
  role = "MEMBER",
  expiresInDays = 7,
  session = null,
}) => {
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  try {
    const invitation = new OrganizationInvitation({
      organizationId,
      invitedUserId,
      invitedBy,
      role,
      status: "PENDING",
      expiresAt,
    });

    await invitation.save({ session });

    return invitation;
  } catch (error) {
    // Partial unique index protection against duplicate PENDING invitations
    if (error.code === 11000) {
      const duplicateError = new Error(
        "ORGANIZATION_INVITATION_ALREADY_EXISTS",
      );

      duplicateError.code = "INVITATION_ALREADY_EXISTS";

      throw duplicateError;
    }

    throw error;
  }
};

/**
 * Find and validate an invitation belonging to the authenticated user.
 *
 * Explicitly distinguishes and handles:
 * - Missing invitation or not belonging to the user: INVITATION_NOT_FOUND
 * - Non-pending states: INVITATION_ALREADY_ACCEPTED, INVITATION_ALREADY_REJECTED,
 *   INVITATION_CANCELLED, INVITATION_EXPIRED
 * - Expired pending invitations: updates status to EXPIRED and throws INVITATION_EXPIRED
 * - Valid pending invitation: returns { invitation, now }
 */
const findAndValidateUserInvitation = async ({
  invitationId,
  userId,
  session = null,
}) => {
  const query = OrganizationInvitation.findOne({
    _id: invitationId,
    invitedUserId: userId,
  });

  if (session) {
    query.session(session);
  }

  const invitation = await query;

  if (!invitation) {
    const error = new Error("ORGANIZATION_INVITATION_NOT_FOUND");
    error.code = "INVITATION_NOT_FOUND";
    throw error;
  }

  if (invitation.status === "ACCEPTED") {
    const error = new Error("INVITATION_ALREADY_ACCEPTED");
    error.code = "INVITATION_ALREADY_ACCEPTED";
    throw error;
  }

  if (invitation.status === "REJECTED") {
    const error = new Error("INVITATION_ALREADY_REJECTED");
    error.code = "INVITATION_ALREADY_REJECTED";
    throw error;
  }

  if (invitation.status === "CANCELLED") {
    const error = new Error("ORGANIZATION_INVITATION_CANCELLED");
    error.code = "INVITATION_CANCELLED";
    throw error;
  }

  if (invitation.status === "EXPIRED") {
    const error = new Error("ORGANIZATION_INVITATION_EXPIRED");
    error.code = "INVITATION_EXPIRED";
    throw error;
  }

  if (invitation.status !== "PENDING") {
    const error = new Error("ORGANIZATION_INVITATION_NOT_FOUND");
    error.code = "INVITATION_NOT_FOUND";
    throw error;
  }

  const now = new Date();

  // Check expiration even if background worker has not updated status yet
  if (invitation.expiresAt <= now) {
    try {
      await OrganizationInvitation.updateOne(
        {
          _id: invitation._id,
          status: "PENDING",
          expiresAt: { $lte: now },
        },
        {
          $set: {
            status: "EXPIRED",
            expiredAt: now,
          },
        },
      );
    } catch (_) {
      // Ignore update error, expiration error takes precedence
    }

    const error = new Error("ORGANIZATION_INVITATION_EXPIRED");
    error.code = "INVITATION_EXPIRED";
    throw error;
  }

  return { invitation, now };
};

/**
 * Accept organization invitation
 *
 * PENDING
 *    ↓
 * OrganizationMember ACTIVE
 *    ↓
 * Invitation ACCEPTED
 */
const acceptOrganizationInvitation = async ({ invitationId, userId }) => {
  // 1. Find and validate invitation state before starting a transaction
  const { invitation, now } = await findAndValidateUserInvitation({
    invitationId,
    userId,
  });

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 2. Organization must still exist and be active
    const organization = await Organization.findOne({
      _id: invitation.organizationId,
      deletedAt: null,
      "settings.status": "ACTIVE",
    }).session(session);

    if (!organization) {
      const error = new Error("ORGANIZATION_NOT_FOUND");
      error.code = "ORGANIZATION_NOT_FOUND";
      throw error;
    }

    // 3. Check existing membership
    const existingMembership = await OrganizationMember.findOne({
      organizationId: invitation.organizationId,
      userId,
    }).session(session);

    if (existingMembership) {
      // Already active
      if (existingMembership.status === "ACTIVE") {
        const error = new Error("USER_ALREADY_ORGANIZATION_MEMBER");
        error.code = "ALREADY_MEMBER";
        throw error;
      }

      // Suspended members cannot accept another invitation
      if (existingMembership.status === "SUSPENDED") {
        const error = new Error("ORGANIZATION_MEMBERSHIP_SUSPENDED");
        error.code = "MEMBERSHIP_SUSPENDED";
        throw error;
      }

      // Re-activate previously removed member
      if (existingMembership.status === "REMOVED") {
        existingMembership.role = invitation.role;
        existingMembership.status = "ACTIVE";
        existingMembership.invitedBy = invitation.invitedBy;
        existingMembership.joinedAt = now;

        await existingMembership.save({ session });
      }
    } else {
      await OrganizationMember.create(
        [
          {
            organizationId: invitation.organizationId,
            userId,
            role: invitation.role,
            status: "ACTIVE",
            invitedBy: invitation.invitedBy,
            joinedAt: now,
          },
        ],
        { session },
      );
    }

    // 4. Atomically transition the invitation from PENDING to ACCEPTED
    const updatedInvitation = await OrganizationInvitation.findOneAndUpdate(
      {
        _id: invitation._id,
        invitedUserId: userId,
        status: "PENDING",
        expiresAt: { $gt: now },
      },
      {
        $set: {
          status: "ACCEPTED",
          respondedAt: now,
        },
      },
      {
        session,
        new: true,
      },
    );

    if (!updatedInvitation) {
      // Invitation state changed concurrently. Abort transaction and re-evaluate state.
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      await findAndValidateUserInvitation({
        invitationId,
        userId,
      });

      const error = new Error("INVITATION_CONFLICT");
      error.code = "INVITATION_CONFLICT";
      throw error;
    }

    await session.commitTransaction();

    return updatedInvitation;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    // Ensure expired invitation is persistently marked EXPIRED even if a transaction was aborted
    if (error.code === "INVITATION_EXPIRED") {
      try {
        await OrganizationInvitation.updateOne(
          {
            _id: invitationId,
            status: "PENDING",
            expiresAt: { $lte: new Date() },
          },
          {
            $set: {
              status: "EXPIRED",
              expiredAt: new Date(),
            },
          },
        );
      } catch (_) {
        // Ignore update error, expiration error takes precedence
      }
    }

    // Handle duplicate key error on OrganizationMember unique index (organizationId + userId)
    if (error.code === 11000) {
      const duplicateError = new Error("USER_ALREADY_ORGANIZATION_MEMBER");
      duplicateError.code = "ALREADY_MEMBER";
      throw duplicateError;
    }

    // Handle MongoDB transaction write conflicts or transient errors
    if (
      error.code === 112 ||
      error.name === "WriteConflict" ||
      error.hasErrorLabel?.("TransientTransactionError")
    ) {
      try {
        await findAndValidateUserInvitation({ invitationId, userId });
      } catch (validationError) {
        throw validationError;
      }

      const conflictError = new Error("INVITATION_CONFLICT");
      conflictError.code = "INVITATION_CONFLICT";
      throw conflictError;
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Reject organization invitation
 */
const rejectOrganizationInvitation = async ({ invitationId, userId }) => {
  // 1. Find and validate invitation state
  const { invitation, now } = await findAndValidateUserInvitation({
    invitationId,
    userId,
  });

  // 2. Atomically transition from PENDING to REJECTED
  const updatedInvitation = await OrganizationInvitation.findOneAndUpdate(
    {
      _id: invitation._id,
      invitedUserId: userId,
      status: "PENDING",
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: "REJECTED",
        respondedAt: now,
      },
    },
    {
      new: true,
    },
  );

  if (!updatedInvitation) {
    // Invitation state changed concurrently. Re-evaluate to throw exact error.
    await findAndValidateUserInvitation({
      invitationId,
      userId,
    });

    const error = new Error("INVITATION_CONFLICT");
    error.code = "INVITATION_CONFLICT";
    throw error;
  }

  return updatedInvitation;
};

/**
 * Cancel organization invitation
 *
 * Authorization is handled by the controller.
 */
const cancelOrganizationInvitation = async ({
  invitationId,
  organizationId,
}) => {
  const invitation = await OrganizationInvitation.findOne({
    _id: invitationId,
    organizationId,
  });

  if (!invitation) {
    const error = new Error("ORGANIZATION_INVITATION_NOT_FOUND");
    error.code = "INVITATION_NOT_FOUND";
    throw error;
  }

  if (invitation.status === "ACCEPTED") {
    const error = new Error("INVITATION_ALREADY_ACCEPTED");
    error.code = "INVITATION_ALREADY_ACCEPTED";
    throw error;
  }

  if (invitation.status === "REJECTED") {
    const error = new Error("INVITATION_ALREADY_REJECTED");
    error.code = "INVITATION_ALREADY_REJECTED";
    throw error;
  }

  if (invitation.status === "CANCELLED") {
    const error = new Error("ORGANIZATION_INVITATION_CANCELLED");
    error.code = "INVITATION_CANCELLED";
    throw error;
  }

  const now = new Date();
  if (invitation.status === "EXPIRED" || invitation.expiresAt <= now) {
    if (invitation.status === "PENDING") {
      try {
        await OrganizationInvitation.updateOne(
          {
            _id: invitation._id,
            status: "PENDING",
            expiresAt: { $lte: now },
          },
          { $set: { status: "EXPIRED", expiredAt: now } },
        );
      } catch (_) {}
    }
    const error = new Error("ORGANIZATION_INVITATION_EXPIRED");
    error.code = "INVITATION_EXPIRED";
    throw error;
  }

  const updatedInvitation = await OrganizationInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      organizationId,
      status: "PENDING",
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: now,
      },
    },
    { new: true },
  );

  if (!updatedInvitation) {
    const current = await OrganizationInvitation.findOne({
      _id: invitationId,
      organizationId,
    });
    if (!current) {
      const error = new Error("ORGANIZATION_INVITATION_NOT_FOUND");
      error.code = "INVITATION_NOT_FOUND";
      throw error;
    }
    if (current.status === "ACCEPTED") {
      const error = new Error("INVITATION_ALREADY_ACCEPTED");
      error.code = "INVITATION_ALREADY_ACCEPTED";
      throw error;
    }
    if (current.status === "REJECTED") {
      const error = new Error("INVITATION_ALREADY_REJECTED");
      error.code = "INVITATION_ALREADY_REJECTED";
      throw error;
    }
    if (current.status === "CANCELLED") {
      const error = new Error("ORGANIZATION_INVITATION_CANCELLED");
      error.code = "INVITATION_CANCELLED";
      throw error;
    }
    if (current.status === "EXPIRED" || current.expiresAt <= now) {
      const error = new Error("ORGANIZATION_INVITATION_EXPIRED");
      error.code = "INVITATION_EXPIRED";
      throw error;
    }
    const error = new Error("INVITATION_CONFLICT");
    error.code = "INVITATION_CONFLICT";
    throw error;
  }

  return updatedInvitation;
};

/**
 * Expire pending invitations
 *
 * PENDING + expiresAt <= now
 *        ↓
 * EXPIRED + expiredAt = now
 */
const expireOrganizationInvitations = async () => {
  const now = new Date();

  const result = await OrganizationInvitation.updateMany(
    {
      status: "PENDING",
      expiresAt: {
        $lte: now,
      },
    },
    {
      $set: {
        status: "EXPIRED",
        expiredAt: now,
      },
    },
  );

  return result;
};

module.exports = {
  findAndValidateUserInvitation,
  createOrganizationInvitation,
  acceptOrganizationInvitation,
  rejectOrganizationInvitation,
  cancelOrganizationInvitation,
  expireOrganizationInvitations,
};
