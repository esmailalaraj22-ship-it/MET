const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // National ID is stored encrypted — never exposed in API responses
    nationalId: {
      type: String,
      required: [true, "رقم الهوية الوطنية مطلوب"],
      unique: true,
      select: false,
    },
    phoneNumber:    { type: String, default: null },
    dateOfBirth:    { type: Date, default: null },
    paypalAccount:  { type: String, default: null },
    bio:            { type: String, default: "", maxlength: 1000 },
    assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

instructorSchema.index({ userId: 1 });

module.exports = mongoose.model("Instructor", instructorSchema);