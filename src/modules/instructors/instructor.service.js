const User              = require("../users/user.model");
const Instructor        = require("./instructor.model");
const Course            = require("../courses/course.model");
const Enrollment        = require("../enrollments/enrollment.model");
const Progress          = require("../progress/progress.model");
const Student           = require("../students/student.model");
const InstructorFinance = require("../finance/instructorFinance.model");
const ApiError          = require("../../utils/ApiError");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

const MET_TO_USD = 2;

// ── PROFILE ───────────────────────────────────────────────
const getInstructorProfile = async (userId) => {
  const user       = await User.findById(userId);
  const instructor = await Instructor.findOne({ userId })
    .populate("assignedCourses", "title enrolledCount totalLessons isPublished thumbnail metCost");
  if (!instructor) throw new ApiError(404, "الملف الشخصي للمدرس غير موجود");
  return { user, instructor };
};

const updateInstructorProfile = async (userId, updates) => {
  const allowed = ["firstName", "secondName", "familyName", "profileImage"];
  const userData = {};
  allowed.forEach((f) => { if (updates[f] !== undefined) userData[f] = updates[f]; });

  const instData = {};
  if (updates.bio           !== undefined) instData.bio           = updates.bio;
  if (updates.paypalAccount !== undefined) instData.paypalAccount = updates.paypalAccount;
  if (updates.phoneNumber   !== undefined) instData.phoneNumber   = updates.phoneNumber;

  if (Object.keys(userData).length > 0) {
    await User.findByIdAndUpdate(userId, userData, { runValidators: true });
  }
  const instructor = await Instructor.findOneAndUpdate({ userId }, instData, { new: true });
  return instructor;
};

// ── DASHBOARD ─────────────────────────────────────────────
const getInstructorDashboard = async (userId) => {
  const instructor = await Instructor.findOne({ userId })
    .populate({
      path: "assignedCourses",
      select: "title enrolledCount totalLessons totalIncome isPublished thumbnail metCost",
    });
  if (!instructor) throw new ApiError(404, "المدرس غير موجود");

  const finance = await InstructorFinance.findOne({ instructorId: instructor._id });

  const totalStudents = instructor.assignedCourses.reduce((s, c) => s + (c.enrolledCount || 0), 0);
  const totalIncome   = finance?.totalEarned   || 0;
  const reserved      = finance?.totalReserved || 0;
  const released      = finance?.totalReleased || 0;

  return {
    instructor,
    stats: {
      totalCourses:  instructor.assignedCourses.length,
      totalStudents,
      finance: {
        totalEarnedMET:   totalIncome,
        totalEarnedUSD:   totalIncome * MET_TO_USD,
        reservedMET:      reserved,
        reservedUSD:      reserved * MET_TO_USD,
        releasedMET:      released,
        releasedUSD:      released * MET_TO_USD,
        availableMET:     totalIncome - reserved - released,
      },
    },
    courses: instructor.assignedCourses,
  };
};

// ── COURSE STUDENTS LIST ──────────────────────────────────
const getCourseStudents = async (userId, courseId, query) => {
  const { page, limit, skip } = getPagination(query);

  const instructor = await Instructor.findOne({ userId });
  if (!instructor) throw new ApiError(404, "المدرس غير موجود");

  const isAssigned = instructor.assignedCourses.some((id) => id.toString() === courseId);
  if (!isAssigned) throw new ApiError(403, "هذا الكورس غير مسند إليك");

  const [enrollments, total] = await Promise.all([
    Enrollment.find({ courseId, status: "active" })
      .populate({
        path: "studentId",
        populate: [
          { path: "userId",       select: "firstName secondName familyName email profileImage" },
          { path: "universityId", select: "name" },
        ],
      })
      .skip(skip).limit(limit).sort({ enrolledAt: -1 }),
    Enrollment.countDocuments({ courseId, status: "active" }),
  ]);

  // Attach progress + check if student was in any other course with this instructor
  const studentsWithDetails = await Promise.all(
    enrollments.map(async (enr) => {
      const studentId = enr.studentId?._id;
      if (!studentId) return null;

      const progress = await Progress.findOne({ studentId, courseId });

      // Check if student was in any other course taught by this instructor
      const otherCourseEnrollments = await Enrollment.findOne({
        studentId,
        courseId: {
          $in: instructor.assignedCourses.filter((id) => id.toString() !== courseId),
        },
        status: { $in: ["active", "completed"] },
      });

      return {
        student:       enr.studentId,
        enrolledAt:    enr.enrolledAt,
        progress:      progress ? { percentage: progress.percentage } : { percentage: 0 },
        previouslyKnown: !!otherCourseEnrollments,
      };
    })
  );

  return {
    students:   studentsWithDetails.filter(Boolean),
    pagination: getPaginationMeta(total, page, limit),
  };
};

// ── FINANCIAL SUMMARY ─────────────────────────────────────
const getFinancialDashboard = async (userId) => {
  const instructor = await Instructor.findOne({ userId })
    .populate("assignedCourses", "title totalIncome metCost enrolledCount instructorPercentage reservedPercentage");
  if (!instructor) throw new ApiError(404, "المدرس غير موجود");

  const finance = await InstructorFinance.findOne({ instructorId: instructor._id });

  const courseBreakdown = instructor.assignedCourses.map((c) => {
    const earned   = Math.round(c.totalIncome * (c.instructorPercentage / 100));
    const reserved = Math.round(c.totalIncome * (c.reservedPercentage / 100));
    return {
      courseId:      c._id,
      title:         c.title,
      enrolledCount: c.enrolledCount,
      totalIncomeMET: c.totalIncome,
      earnedMET:     earned,
      earnedUSD:     earned * MET_TO_USD,
      reservedMET:   reserved,
      reservedUSD:   reserved * MET_TO_USD,
    };
  });

  return {
    summary: {
      totalEarnedMET:   finance?.totalEarned   || 0,
      totalEarnedUSD:   (finance?.totalEarned  || 0) * MET_TO_USD,
      reservedMET:      finance?.totalReserved || 0,
      reservedUSD:      (finance?.totalReserved|| 0) * MET_TO_USD,
      releasedMET:      finance?.totalReleased || 0,
      releasedUSD:      (finance?.totalReleased|| 0) * MET_TO_USD,
    },
    courseBreakdown,
    recentTransactions: (finance?.transactions || []).slice(-20).reverse(),
  };
};

module.exports = {
  getInstructorProfile, updateInstructorProfile,
  getInstructorDashboard, getCourseStudents,
  getFinancialDashboard,
};