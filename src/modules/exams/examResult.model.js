const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  questionId:    { type: mongoose.Schema.Types.ObjectId },
  questionType:  { type: String, enum: ["mcq", "written"] },
  mcqAnswer:     { type: Number, default: null },    // index chosen (MCQ)
  writtenAnswer: { type: String, default: "" },       // text answer (written)
  isCorrect:     { type: Boolean, default: null },    // null = not graded yet (written)
  pointsEarned:  { type: Number, default: 0 },
}, { _id: false });

const examResultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    answers:          [answerSchema],
    score:            { type: Number, default: 0 },   // percentage 0-100
    isPassed:         { type: Boolean, default: false },
    timeTaken:        { type: Number, default: 0 },   // seconds
    isFullyGraded:    { type: Boolean, default: false },
    // Manual grade modification
    isManuallyModified: { type: Boolean, default: false },
    manualModifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    manualModifiedAt:   { type: Date, default: null },
    // Grade visible to student?
    gradeVisible:     { type: Boolean, default: true },
    submittedAt:      { type: Date, default: Date.now },
  },
  { timestamps: true }
);

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examResultSchema.index({ examId: 1, score: -1 });

module.exports = mongoose.model("ExamResult", examResultSchema);