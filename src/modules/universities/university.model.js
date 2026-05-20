const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name:      { type: String, required: [true, "اسم الجامعة مطلوب"], unique: true, trim: true },
    nameEn:    { type: String, trim: true, default: "" },
    logo:      { type: String, default: null },
    city:      { type: String, trim: true, default: "" },
    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

universitySchema.index({ name: "text", nameEn: "text" });

module.exports = mongoose.model("University", universitySchema);