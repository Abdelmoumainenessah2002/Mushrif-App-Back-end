const mongoose = require("mongoose");

const workItemSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

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

    number: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 255,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 10000,
    },

    type: {
      type: String,
      enum: ["TASK", "BUG", "STORY"],
      default: "TASK",
      index: true,
    },

    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
      default: "TODO",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      default: null,
      index: true,
    },

    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      default: null,
      index: true,
    },

    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
      index: true,
    },

    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Label",
      },
    ],

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    estimate: {
      type: Number,
      min: 0,
      default: null,
    },

    position: {
      type: Number,
      default: 0,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

workItemSchema.index({ projectId: 1, number: 1 }, { unique: true });

workItemSchema.index({ projectId: 1, status: 1 });

workItemSchema.index({ projectId: 1, assigneeId: 1 });

workItemSchema.index({ projectId: 1, priority: 1 });

workItemSchema.index({ projectId: 1, type: 1 });

module.exports = mongoose.model("WorkItem", workItemSchema);
