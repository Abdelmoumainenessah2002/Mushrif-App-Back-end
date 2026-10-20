const mongoose = require("mongoose");
const Joi = require("joi");

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MEMBER"],
      default: "MEMBER",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "REMOVED"],
      default: "ACTIVE",
      required: true,
      index: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    joinedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate membership
organizationMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);

// Get organization members by status
organizationMemberSchema.index({
  organizationId: 1,
  status: 1,
});

// Get user's organizations by status
organizationMemberSchema.index({
  userId: 1,
  status: 1,
});

const validateInviteUsers = (data) => {
  const schema = Joi.object({
    userIds: Joi.array()
      .items(
        Joi.string()
          .trim()
          .pattern(/^[0-9a-fA-F]{24}$/)
          .required(),
      )
      .min(1)
      .unique()
      .required(),
  });

  return schema.validate(data);
};

const OrganizationMember = mongoose.model(
  "OrganizationMember",
  organizationMemberSchema,
);

module.exports = {
  OrganizationMember,
  validateInviteUsers,
};
