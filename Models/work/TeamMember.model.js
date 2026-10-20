const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
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
      enum: ["LEAD", "MEMBER"],
      default: "MEMBER",
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

teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("TeamMember", teamMemberSchema);
