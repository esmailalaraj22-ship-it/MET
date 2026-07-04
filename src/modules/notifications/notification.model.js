const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "new_lesson",
        "new_assignment",
        "new_exam",
        "post_reply",
        "comment_reply",
        "message",
        "course_update",
        "student_dropped",
        "system",
      ],
      required: true,
    },
    title:       { type: String, required: true },
    body:        { type: String, required: true },
    relatedId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    relatedType: { type: String, default: null },
    isRead:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);