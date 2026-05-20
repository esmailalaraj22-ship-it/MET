const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName:   { type: String, required: [true, "الاسم الأول مطلوب"], trim: true },
    secondName:  { type: String, required: [true, "الاسم الثاني مطلوب"], trim: true },
    familyName:  { type: String, required: [true, "اسم العائلة مطلوب"], trim: true },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "البريد الإلكتروني غير صالح"],
      index: true,
    },
    password:     { type: String, required: [true, "كلمة المرور مطلوبة"], select: false, minlength: 6 },
    role:         { type: String, enum: ["student", "instructor", "admin"], required: true },
    profileImage: { type: String, default: null },
    isActive:     { type: Boolean, default: true },
    isVerified:   { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    lastLoginAt:  { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare entered password to stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual: full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.secondName} ${this.familyName}`;
});

module.exports = mongoose.model("User", userSchema);