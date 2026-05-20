const mongoose = require("mongoose");

const metTransactionSchema = new mongoose.Schema({
  amount:      { type: Number, required: true },        // positive=credit, negative=debit
  type:        { type: String, enum: ["credit", "debit", "refund"], required: true },
  description: { type: String, default: "" },
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  createdAt:   { type: Date, default: Date.now },
}, { _id: false });

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: [true, "الجامعة مطلوبة"],
    },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    // MET Points System: 1 MET = 2 USD. New students get 250 MET free.
    metPoints: { type: Number, default: 250, min: 0 },
    metTransactions: [metTransactionSchema],
    discount: {
      type:      { type: String, enum: ["percentage", "fixed"], default: null },
      value:     { type: Number, default: 0 },
      appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      appliedAt: { type: Date },
    },
  },
  { timestamps: true }
);

studentSchema.index({ userId: 1 });
studentSchema.index({ universityId: 1 });

module.exports = mongoose.model("Student", studentSchema);