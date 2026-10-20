const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
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

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: ["UPCOMING", "IN_PROGRESS", "COMPLETED", "MISSED", "ARCHIVED"],
      default: "UPCOMING",
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
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

milestoneSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Milestone", milestoneSchema);
