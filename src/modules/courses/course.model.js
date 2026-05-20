const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, "عنوان الكورس مطلوب"], trim: true },
    description: { type: String, default: "" },
    thumbnail:   { type: String, default: null },
    slug:        { type: String, unique: true, index: true },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      default: null,
    },
    allowedUniversities: [
      { type: mongoose.Schema.Types.ObjectId, ref: "University" }
    ],
    category:   { type: String, default: "" },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    isPublished:          { type: Boolean, default: false },
    totalLessons:         { type: Number, default: 0 },
    instructorPercentage: { type: Number, default: 0, min: 0, max: 100 },
    reservedPercentage:   { type: Number, default: 0, min: 0, max: 100 },
    // MET cost to enroll (admin sets this). 0 = free course.
    metCost:              { type: Number, default: 0, min: 0 },
    price:                { type: Number, default: 0, min: 0 },   // USD equivalent kept for records
    totalIncome:          { type: Number, default: 0 },           // in MET
    totalReserved:        { type: Number, default: 0 },           // instructor reserved MET
    enrolledCount:        { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

courseSchema.index({ allowedUniversities: 1 });
courseSchema.index({ instructorId: 1 });
courseSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Course", courseSchema);