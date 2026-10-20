const mongoose = require("mongoose");

const labelSchema = new mongoose.Schema(
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
      minlength: 1,
      maxlength: 50,
    },

    color: {
      type: String,
      required: true,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
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

labelSchema.index({ projectId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Label", labelSchema);
