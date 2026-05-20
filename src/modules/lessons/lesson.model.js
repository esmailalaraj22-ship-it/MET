const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title:       { type: String, required: [true, "عنوان الدرس مطلوب"], trim: true },
    description: { type: String, default: "" },
    videoUrl:    { type: String, default: null },
    duration:    { type: Number, default: 0 }, // seconds
    order:       { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);