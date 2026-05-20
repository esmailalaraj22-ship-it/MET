const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completedLessons:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
    completedAssignments:[{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }],
    completedExams:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
    percentage:          { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

progressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);