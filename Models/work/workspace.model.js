const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

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
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    icon: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },

    settings: {
      defaultProjectView: {
        type: String,
        enum: ["kanban", "list", "calendar", "timeline"],
        default: "kanban",
      },

      defaultTaskView: {
        type: String,
        enum: ["list", "kanban"],
        default: "list",
      },

      defaultTaskStatus: {
        type: String,
        enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
        default: "TODO",
      },

      defaultPriority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        default: "MEDIUM",
      },

      timezone: {
        type: String,
        default: null,
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

workspaceSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model("Workspace", workspaceSchema);
