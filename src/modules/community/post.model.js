const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // null = General Community | ObjectId = Course Community
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    content:     { type: String, required: [true, "محتوى المنشور مطلوب"], trim: true },
    attachments: [{ type: String }],
    likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted:   { type: Boolean, default: false },
    isPinned:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ courseId: 1, createdAt: -1 });
postSchema.index({ authorId: 1 });

module.exports = mongoose.model("Post", postSchema);