const mongoose = require("mongoose");
const Joi = require("joi");

const organizationInvitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "MEMBER"],
      default: "MEMBER",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    // Invitation validity period
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Set when invitation becomes EXPIRED.
    // MongoDB deletes the document 180 days later.
    expiredAt: {
      type: Date,
      default: null,
    },

    // Set when user accepts or rejects
    respondedAt: {
      type: Date,
      default: null,
    },

    // Set when OWNER/ADMIN cancels invitation
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Find invitations by organization/user/status
organizationInvitationSchema.index({
  organizationId: 1,
  invitedUserId: 1,
  status: 1,
});

// Find user's invitations
organizationInvitationSchema.index({
  invitedUserId: 1,
  status: 1,
});

// Only one PENDING invitation per user/organization
organizationInvitationSchema.index(
  {
    organizationId: 1,
    invitedUserId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "PENDING",
    },
  },
);

// Automatically delete EXPIRED invitations
// 180 days after expiredAt
organizationInvitationSchema.index(
  { expiredAt: 1 },
  {
    expireAfterSeconds: 180 * 24 * 60 * 60,
  },
);

const validateCreateOrganizationInvitation = (data) => {
  const schema = Joi.object({
    invitedUserId: Joi.string()
      .trim()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),

    role: Joi.string().valid("ADMIN", "MEMBER").default("MEMBER"),
  });

  return schema.validate(data);
};

const OrganizationInvitation = mongoose.model(
  "OrganizationInvitation",
  organizationInvitationSchema,
);

module.exports = {
  OrganizationInvitation,
  validateCreateOrganizationInvitation,
};
