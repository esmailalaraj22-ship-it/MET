const mongoose = require("mongoose");

// A question can be MCQ (auto-graded) or written (manual grading)
const questionSchema = new mongoose.Schema({
  questionText:  { type: String, required: true },
  questionType:  { type: String, enum: ["mcq", "written"], default: "mcq" },
  // MCQ fields
  options:       [{ type: String }],   // 4-7 choices
  correctAnswer: { type: Number, default: null }, // index of correct option (MCQ only)
  // Common
  points:        { type: Number, default: 1 },
}, { _id: true });

const examSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:        { type: String, required: [true, "عنوان الاختبار مطلوب"], trim: true },
    description:  { type: String, default: "" },
    type:         { type: String, enum: ["quiz", "midterm", "final"], default: "quiz" },
    questions:    [questionSchema],
    duration:     { type: Number, default: 30 },   // minutes; 0 = unlimited
    passingScore: { type: Number, default: 50 },   // percentage
    isPublished:  { type: Boolean, default: false },
    // Time control
    startTime:    { type: Date, default: null },    // null = available immediately when published
    endTime:      { type: Date, default: null },    // null = no deadline
    // Grade visibility: show grades right after submission or hold until instructor releases
    showGradesImmediately: { type: Boolean, default: true },
    gradesReleasedAt:      { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);