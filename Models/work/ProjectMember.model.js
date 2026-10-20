const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
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
      enum: ["PROJECT_ADMIN", "MANAGER", "MEMBER", "VIEWER"],
      default: "MEMBER",
    },

    status: {
      type: String,
      enum: ["INVITED", "ACTIVE", "SUSPENDED", "REMOVED"],
      default: "INVITED",
    },

    addedBy: {
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

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ProjectMember", projectMemberSchema);
