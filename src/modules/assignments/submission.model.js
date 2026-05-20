const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    submissionType: { type: String, enum: ["pdf", "image", "text"], required: true },
    fileUrl:        { type: String, default: null },    // for pdf/image
    textAnswer:     { type: String, default: "" },      // for text
    score:          { type: Number, default: null },
    feedback:       { type: String, default: "" },
    gradedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    gradedAt:       { type: Date, default: null },
    submittedAt:    { type: Date, default: Date.now },
    isLate:         { type: Boolean, default: false },  // submitted after dueDate
  },
  { timestamps: true }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ assignmentId: 1, submittedAt: 1 });

module.exports = mongoose.model("Submission", submissionSchema);