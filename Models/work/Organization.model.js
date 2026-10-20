const Joi = require("joi");
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    logo: {
      url: {
        type: String,
        trim: true,
      },
      publicId: {
        type: String,
        trim: true,
      },
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    settings: {
      defaultLanguage: {
        type: String,
        enum: ["ar", "fr", "en"],
        default: "ar",
      },

      defaultTimezone: {
        type: String,
        default: "Africa/Algiers",
      },

      dateFormat: {
        type: String,
        default: "DD/MM/YYYY",
      },

      timeFormat: {
        type: String,
        enum: ["12h", "24h"],
        default: "24h",
      },

      weekStartsOn: {
        type: String,
        enum: ["saturday", "sunday", "monday"],
        default: "saturday",
      },

      defaultProjectView: {
        type: String,
        enum: ["kanban", "list", "calendar", "timeline"],
        default: "kanban",
      },

      status: {
        type: String,
        enum: ["ACTIVE", "SUSPENDED", "ARCHIVED"],
        default: "ACTIVE",
        index: true,
      },

      allowMemberInvites: {
        type: Boolean,
        default: true,
      },

      allowGuestUsers: {
        type: Boolean,
        default: false,
      },

      notifications: {
        email: {
          type: Boolean,
          default: true,
        },

        inApp: {
          type: Boolean,
          default: true,
        },
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);


// validation function for organization data
function validateCreateOrganization(data) {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),

    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .required(),

    description: Joi.string().max(1000).allow(""),

    settings: Joi.object({
      defaultLanguage: Joi.string().valid("ar", "fr", "en"),

      defaultTimezone: Joi.string(),

      dateFormat: Joi.string(),

      timeFormat: Joi.string().valid("12h", "24h"),

      weekStartsOn: Joi.string().valid("saturday", "sunday", "monday"),

      defaultProjectView: Joi.string().valid(
        "kanban",
        "list",
        "calendar",
        "timeline",
      ),

      allowMemberInvites: Joi.boolean(),

      allowGuestUsers: Joi.boolean(),

      notifications: Joi.object({
        email: Joi.boolean(),
        inApp: Joi.boolean(),
      }),
    }),
  });

  return schema.validate(data);
}


// validation function for modifying organization settings
function validateModifyOrganizationSettings(data) {
  const schema = Joi.object({
    defaultLanguage: Joi.string().valid("ar", "fr", "en"),

    defaultTimezone: Joi.string(),

    dateFormat: Joi.string(),

    timeFormat: Joi.string().valid("12h", "24h"),

    weekStartsOn: Joi.string().valid("saturday", "sunday", "monday"),

    defaultProjectView: Joi.string().valid(
      "kanban",
      "list",
      "calendar",
      "timeline",
    ),

    status: Joi.string().valid("ACTIVE", "SUSPENDED", "ARCHIVED"),

    allowMemberInvites: Joi.boolean(),

    allowGuestUsers: Joi.boolean(),

    notifications: Joi.object({
      email: Joi.boolean(),
      inApp: Joi.boolean(),
    }),
  }).min(1);

  return schema.validate(data);
}


const Organization = mongoose.model("Organization", organizationSchema);

module.exports = {
  Organization,
  validateCreateOrganization,
  validateModifyOrganizationSettings,
};
