const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    permissions: {
      manageUsers:        { type: Boolean, default: true },
      manageCourses:      { type: Boolean, default: true },
      manageInstructors:  { type: Boolean, default: true },
      manageUniversities: { type: Boolean, default: true },
      manageFinance:      { type: Boolean, default: true },
      manageNotifications:{ type: Boolean, default: true },
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

adminSchema.index({ userId: 1 });

module.exports = mongoose.model("Admin", adminSchema);