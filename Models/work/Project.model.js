const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    key: {  // Unique key for the project, used in issue keys (e.g., "PROJ-123")
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
      match: /^[A-Z0-9]+$/,
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
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"],
      default: "PLANNING",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {    // Optional due date for the project
      type: Date,
      default: null,
    },

    settings: {
      defaultView: {
        type: String,
        enum: ["kanban", "list", "calendar", "timeline"],
        default: "kanban",
      },

      allowComments: {
        type: Boolean,
        default: true,
      },

      allowAttachments: {
        type: Boolean,
        default: true,
      },

      allowGuests: {
        type: Boolean,
        default: false,
      },
    },

    workItemCounter: {
      type: Number,
      default: 0,
      min: 0,
    },

    archivedAt: {
      type: Date,
      default: null,
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

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

projectSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

projectSchema.index({ organizationId: 1, workspaceId: 1 });

module.exports = mongoose.model("Project", projectSchema);
