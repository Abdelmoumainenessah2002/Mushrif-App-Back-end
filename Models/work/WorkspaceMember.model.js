const mongoose = require("mongoose");

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
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
      enum: ["ADMIN", "MEMBER", "GUEST"],
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

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("WorkspaceMember", workspaceMemberSchema);
