const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    workItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      required: true,
      index: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },

    editedAt: {
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

commentSchema.index({
  workItemId: 1,
  createdAt: 1,
});

module.exports = mongoose.model("Comment", commentSchema);
