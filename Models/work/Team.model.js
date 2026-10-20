const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
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
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    avatar: {
      type: String,
      trim: true,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

teamSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Team", teamSchema);
