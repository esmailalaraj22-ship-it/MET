const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title:       { type: String, required: [true, "عنوان الواجب مطلوب"], trim: true },
    description: { type: String, default: "" },
    // What type of submission is accepted
    submissionType: {
      type: String,
      enum: ["any", "pdf", "image", "text"],
      default: "any",
    },
    dueDate:     { type: Date, default: null },
    maxScore:    { type: Number, default: 100 },
    attachments: [{ type: String }],   // instructor's reference files
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);