const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
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

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    workItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      default: null,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "WORK_ITEM_CREATED",
        "WORK_ITEM_UPDATED",
        "STATUS_CHANGED",
        "PRIORITY_CHANGED",
        "ASSIGNED",
        "UNASSIGNED",
        "COMMENT_ADDED",
        "ATTACHMENT_ADDED",
        "LABEL_ADDED",
        "LABEL_REMOVED",
        "EPIC_CHANGED",
        "MILESTONE_CHANGED",
        "WORK_ITEM_DELETED",
        "WORK_ITEM_RESTORED",
      ],
      required: true,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

activitySchema.index({
  projectId: 1,
  createdAt: -1,
});

activitySchema.index({
  workItemId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Activity", activitySchema);
