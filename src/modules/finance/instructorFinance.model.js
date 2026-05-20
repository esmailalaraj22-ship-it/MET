const mongoose = require("mongoose");

const financeTransactionSchema = new mongoose.Schema({
  courseId:    { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  courseTitle: { type: String },
  amount:      { type: Number, required: true },           // in MET
  amountUSD:   { type: Number },                           // 1 MET = 2 USD
  type:        { type: String, enum: ["earned", "released", "reserved", "cancelled"], required: true },
  releasedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  note:        { type: String, default: "" },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const instructorFinanceSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
      unique: true,
    },
    totalEarned:   { type: Number, default: 0 },   // total MET earned all time
    totalReserved: { type: Number, default: 0 },   // currently held by academy
    totalReleased: { type: Number, default: 0 },   // paid out to instructor
    transactions:  [financeTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstructorFinance", instructorFinanceSchema);