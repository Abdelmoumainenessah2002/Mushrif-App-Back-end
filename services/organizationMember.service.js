const {
  OrganizationMember,
} = require("../models/work/OrganizationMember.model");
const { Organization } = require("../models/work/Organization.model");
const {
  OrganizationInvitation,
} = require("../models/work/OrganizationInvitation.model");

const createOrganizationOwner = async ({
  organizationId,
  userId,
  session = null,
}) => {
  const organizationMember = new OrganizationMember({
    organizationId,
    userId,
    role: "OWNER",
    status: "ACTIVE",
    invitedBy: null,
    joinedAt: new Date(),
  });

  await organizationMember.save(session ? { session } : undefined);

  return organizationMember;
};

const isOrganizationAdmin = async (organizationId, userId) => {
  let orgId = organizationId;
  let uId = userId;

  if (typeof organizationId === "object" && organizationId !== null && !userId) {
    orgId = organizationId.organizationId;
    uId = organizationId.userId;
  }

  const organization = await Organization.findOne({
    _id: orgId,
    deletedAt: null,
    "settings.status": "ACTIVE",
  });

  if (!organization) {
    return {
      organizationAvailable: false,
      isAdmin: false,
    };
  }

  const member = await OrganizationMember.findOne({
    organizationId: organization._id,
    userId: uId,
    role: { $in: ["OWNER", "ADMIN"] },
    status: "ACTIVE",
  });

  return {
    organizationAvailable: true,
    isAdmin: !!member,
  };
};

/**
 * Remove organization member
 *
 * @param {Object} params
 * @param {string|ObjectId} params.organizationId
 * @param {string|ObjectId} params.memberId - OrganizationMember ID or User ID
 * @param {string|ObjectId} [params.requesterId] - User ID of the requester
 * @param {string|ObjectId} [params.userId] - Alias for requesterId
 */
const removeOrganizationMember = async ({
  organizationId,
  memberId,
  requesterId = null,
  userId = null,
}) => {
  const reqUserId = requesterId || userId;

  // 1. Get organization
  const organization = await Organization.findOne({
    _id: organizationId,
    deletedAt: null,
    "settings.status": "ACTIVE",
  });

  if (!organization) {
    const error = new Error("ORGANIZATION_NOT_FOUND");
    error.code = "ORGANIZATION_NOT_FOUND";
    throw error;
  }

  // 2. If requester is provided, check requester permissions
  if (reqUserId) {
    const requesterMembership = await OrganizationMember.findOne({
      organizationId: organization._id,
      userId: reqUserId,
      status: "ACTIVE",
    });

    const isOwner = organization.ownerId.toString() === reqUserId.toString();
    const isAdmin =
      requesterMembership &&
      (requesterMembership.role === "ADMIN" ||
        requesterMembership.role === "OWNER");

    if (!isOwner && !isAdmin) {
      const error = new Error("NOT_ORGANIZATION_ADMIN");
      error.code = "NOT_ORGANIZATION_ADMIN";
      throw error;
    }
  }

  // 3. Find the target member (by membership _id or userId)
  const targetMember = await OrganizationMember.findOne({
    organizationId: organization._id,
    $or: [{ _id: memberId }, { userId: memberId }],
  });

  if (!targetMember || targetMember.status === "REMOVED") {
    const error = new Error("ORGANIZATION_MEMBER_NOT_FOUND");
    error.code = "MEMBER_NOT_FOUND";
    throw error;
  }

  // 4. Cannot remove the organization owner
  const isTargetOwner =
    targetMember.role === "OWNER" ||
    organization.ownerId.toString() === targetMember.userId.toString();

  if (isTargetOwner) {
    const error = new Error("CANNOT_REMOVE_ORGANIZATION_OWNER");
    error.code = "CANNOT_REMOVE_OWNER";
    throw error;
  }

  // 5. Admin cannot remove another Admin or Owner
  if (reqUserId) {
    const requesterIsOwner =
      organization.ownerId.toString() === reqUserId.toString();
    if (!requesterIsOwner && targetMember.role === "ADMIN") {
      const error = new Error("INSUFFICIENT_PERMISSIONS");
      error.code = "INSUFFICIENT_PERMISSIONS";
      throw error;
    }
  }

  // 6. Update member status to REMOVED
  targetMember.status = "REMOVED";
  await targetMember.save();

  // 7. Cancel any pending invitations for this user in this organization
  await OrganizationInvitation.updateMany(
    {
      organizationId: organization._id,
      invitedUserId: targetMember.userId,
      status: "PENDING",
    },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    },
  );

  return targetMember;
};

/**
 * Get all organizations for a specific user
 *
 * @param {Object} params
 * @param {string|ObjectId} params.userId
 * @returns {Promise<Array>} List of organizations formatted for selection
 */
const getUserOrganizations = async ({ userId }) => {
  const memberships = await OrganizationMember.find({
    userId,
    status: "ACTIVE",
  })
    .populate({
      path: "organizationId",
      match: { deletedAt: null },
      select:
        "name slug description logo ownerId settings createdBy createdAt updatedAt",
    })
    .sort({ joinedAt: -1, createdAt: -1 })
    .lean();

  // Filter out any entries where the organization was deleted or not found
  const activeMemberships = memberships.filter(
    (m) => m.organizationId && m.organizationId._id,
  );

  if (activeMemberships.length === 0) {
    return [];
  }

  // Collect organization IDs to aggregate active member counts
  const orgIds = activeMemberships.map((m) => m.organizationId._id);

  const memberCounts = await OrganizationMember.aggregate([
    {
      $match: {
        organizationId: { $in: orgIds },
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: "$organizationId",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(
    memberCounts.map((item) => [item._id.toString(), item.count]),
  );

  return activeMemberships.map((membership) => {
    const org = membership.organizationId;
    const isOwner =
      membership.role === "OWNER" ||
      org.ownerId?.toString() === userId.toString();

    return {
      id: org._id,
      name: org.name,
      slug: org.slug,
      description: org.description || "",
      logo: org.logo?.url ? org.logo : null,
      role: membership.role,
      isOwner,
      status: org.settings?.status || "ACTIVE",
      memberCount: countMap.get(org._id.toString()) || 1,
      joinedAt: membership.joinedAt || membership.createdAt,
      membershipId: membership._id,
      settings: {
        defaultLanguage: org.settings?.defaultLanguage || "ar",
        defaultTimezone: org.settings?.defaultTimezone || "Africa/Algiers",
        dateFormat: org.settings?.dateFormat || "DD/MM/YYYY",
        timeFormat: org.settings?.timeFormat || "24h",
        weekStartsOn: org.settings?.weekStartsOn || "saturday",
        defaultProjectView: org.settings?.defaultProjectView || "kanban",
        status: org.settings?.status || "ACTIVE",
        allowMemberInvites: org.settings?.allowMemberInvites ?? true,
        allowGuestUsers: org.settings?.allowGuestUsers ?? false,
      },
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  });
};

module.exports = {
  createOrganizationOwner,
  isOrganizationAdmin,
  removeOrganizationMember,
  getUserOrganizations,
};
