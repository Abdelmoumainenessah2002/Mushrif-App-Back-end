const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    workItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["FILE", "IMAGE", "VIDEO", "TEXT", "LINK"],
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    // Used for TEXT attachments
    content: {
      type: String,
      trim: true,
      maxlength: 50000,
    },

    // Used for LINK attachments
    url: {
      type: String,
      trim: true,
      maxlength: 2048,
    },

    // Cloudinary / uploaded file information
    publicId: {
      type: String,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
    },

    mimeType: {
      type: String,
      trim: true,
    },

    size: {
      type: Number,
      min: 0,
    },

    format: {
      type: String,
      trim: true,
    },

    originalName: {
      type: String,
      trim: true,
      maxlength: 255,
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

attachmentSchema.index({
  workItemId: 1,
  createdAt: 1,
});

module.exports = mongoose.model("Attachment", attachmentSchema);
