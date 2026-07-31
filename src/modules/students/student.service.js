const User              = require("../users/user.model");
const Student           = require("./student.model");
const Course            = require("../courses/course.model");
const Enrollment        = require("../enrollments/enrollment.model");
const Progress          = require("../progress/progress.model");
const Instructor        = require("../instructors/instructor.model");
const InstructorFinance = require("../finance/instructorFinance.model");
const ApiError          = require("../../utils/ApiError");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

const MET_TO_USD = 2; // 1 MET = 2 USD

// ── PROFILE ───────────────────────────────────────────────
const getStudentProfile = async (userId) => {
  const student = await Student.findOne({ userId })
    .populate("userId",       "firstName secondName familyName email profileImage createdAt")
    .populate("universityId", "name city logo");
  if (!student) throw new ApiError(404, "الملف الشخصي للطالب غير موجود");
  return student;
};

const updateStudentProfile = async (userId, updates) => {
  const allowed = ["firstName", "secondName", "familyName", "profileImage"];
  const userData = {};
  allowed.forEach((field) => {
    if (updates[field] !== undefined) userData[field] = updates[field];
  });

  if (Object.keys(userData).length > 0) {
    const user = await User.findByIdAndUpdate(userId, userData, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new ApiError(404, "حساب الطالب غير موجود");
  }

  return await getStudentProfile(userId);
};

// ── DASHBOARD ─────────────────────────────────────────────
const getStudentDashboard = async (userId) => {
  const student = await Student.findOne({ userId })
    .populate("universityId", "name city logo");
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollments = await Enrollment.find({
    studentId: student._id,
    status: { $in: ["active", "completed"] },
  })
    .populate({
      path: "courseId",
      select: "title description thumbnail category level totalLessons isPublished metCost instructorId",
      populate: {
        path: "instructorId",
        populate: { path: "userId", select: "firstName familyName profileImage" },
      },
    });

  const coursesWithProgress = await Promise.all(
    enrollments.map(async (enr) => {
      const progress = await Progress.findOne({
        studentId: student._id, courseId: enr.courseId?._id,
      });
      return {
        enrollment: { id: enr._id, enrolledAt: enr.enrolledAt, status: enr.status },
        course:     enr.courseId,
        progress:   progress ? { percentage: progress.percentage, lastAccessedAt: progress.lastAccessedAt } : { percentage: 0 },
      };
    })
  );

  return {
    student: {
      id:          student._id,
      userId:      student.userId,
      university:  student.universityId,
      metPoints:   student.metPoints,
      discount:    student.discount,
    },
    enrolledCourses: coursesWithProgress,
    totalEnrolled:   coursesWithProgress.length,
  };
};

// ── AVAILABLE COURSES (university filter) ─────────────────
const getAvailableCourses = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const filter = { isPublished: true, allowedUniversities: student.universityId };
  if (query.search)   filter.$text    = { $search: query.search };
  if (query.category) filter.category = query.category;
  if (query.level)    filter.level    = query.level;

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate({ path: "instructorId", populate: { path: "userId", select: "firstName familyName profileImage" } })
      .select("title description thumbnail category level totalLessons metCost price enrolledCount slug instructorId")
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Course.countDocuments(filter),
  ]);

  const enrolledIds = (
    await Enrollment.find({
      studentId: student._id,
      status: { $in: ["active", "completed"] },
    }).select("courseId")
  ).map((e) => e.courseId.toString());

  return {
    courses: courses.map((c) => ({
      ...c.toObject(),
      isEnrolled:     enrolledIds.includes(c._id.toString()),
      canAfford:      student.metPoints >= c.metCost,
      metCostDisplay: `${c.metCost} MET (≈ ${c.metCost * MET_TO_USD} USD)`,
    })),
    pagination:  getPaginationMeta(total, page, limit),
    myMetPoints: student.metPoints,
  };
};

// ── ENROLL (MET deduction) ────────────────────────────────
const enrollInCourse = async (userId, courseId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const course = await Course.findOne({
    _id: courseId, isPublished: true, allowedUniversities: student.universityId,
  });
  if (!course) throw new ApiError(404, "الكورس غير متاح لجامعتك أو غير موجود");

  const existing = await Enrollment.findOne({ studentId: student._id, courseId });
  if (existing) throw new ApiError(409, "أنت مسجل في هذا الكورس بالفعل");

  // Calculate actual cost after discount
  let finalCost = course.metCost;
  if (student.discount?.type && student.discount?.value) {
    if (student.discount.type === "percentage") {
      finalCost = Math.max(0, Math.round(course.metCost * (1 - student.discount.value / 100)));
    } else {
      finalCost = Math.max(0, course.metCost - student.discount.value);
    }
  }

  if (student.metPoints < finalCost) {
    throw new ApiError(400, `نقاط MET غير كافية. تحتاج ${finalCost} MET، لديك ${student.metPoints} MET فقط`);
  }

  // Create enrollment FIRST — the unique index (studentId, courseId) rejects
  // duplicates, so a concurrent double-request can never deduct MET twice
  await Enrollment.create({ studentId: student._id, courseId, metPaid: finalCost });

  // Deduct MET from student
  student.metPoints -= finalCost;
  student.metTransactions.push({
    amount:      -finalCost,
    type:        "debit",
    description: `التسجيل في كورس: ${course.title}`,
    courseId:    course._id,
  });
  await student.save();
  await Progress.findOneAndUpdate(
    { studentId: student._id, courseId },
    {
      completedLessons: [],
      completedAssignments: [],
      completedExams: [],
      percentage: 0,
      lastAccessedAt: new Date(),
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Update course counters
  await Course.findByIdAndUpdate(courseId, {
    $inc: {
      enrolledCount: 1,
      totalIncome:   finalCost,
      totalReserved: Math.round(finalCost * (course.reservedPercentage / 100)),
    },
  });

  // Update instructor finance if instructor assigned
  if (course.instructorId) {
    const instructorEarning = Math.round(finalCost * (course.instructorPercentage / 100));
    const reservedForAcademy = Math.round(finalCost * (course.reservedPercentage / 100));

    await InstructorFinance.findOneAndUpdate(
      { instructorId: course.instructorId },
      {
        $inc: { totalEarned: instructorEarning, totalReserved: reservedForAcademy },
        $push: {
          transactions: {
            courseId:    course._id,
            courseTitle: course.title,
            amount:      instructorEarning,
            amountUSD:   instructorEarning * MET_TO_USD,
            type:        "earned",
          },
        },
      },
      { upsert: true }
    );
  }

  await Student.findByIdAndUpdate(student._id, { $addToSet: { enrolledCourses: courseId } });

  return {
    message:    "تم التسجيل بنجاح",
    metDeducted: finalCost,
    metRemaining: student.metPoints,
  };
};

// ── DROP COURSE (full MET refund within 48h of enrollment) ──
const REFUND_WINDOW_HOURS = 48;

const dropCourse = async (userId, courseId, confirmNoRefund = false) => {
  const student    = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId });
  if (!enrollment) throw new ApiError(404, "أنت غير مسجل في هذا الكورس");

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "الكورس غير موجود");

  // Amount actually paid — for enrollments created before metPaid existed,
  // fall back to the debit recorded in the student's MET transaction log
  let paidAmount = enrollment.metPaid;
  if (paidAmount == null) {
    const debitTx = [...student.metTransactions]
      .reverse()
      .find((t) => t.type === "debit" && t.courseId?.toString() === courseId.toString());
    paidAmount = debitTx ? Math.abs(debitTx.amount) : 0;
  }

  const hoursSinceEnrollment =
    (Date.now() - new Date(enrollment.enrolledAt).getTime()) / (1000 * 60 * 60);
  const refundable = hoursSinceEnrollment <= REFUND_WINDOW_HOURS && paidAmount > 0;

  // Refund window expired: warn and require explicit confirmation before
  // withdrawing without a refund (frontend re-sends with confirm=true)
  if (!refundable && paidAmount > 0 && !confirmNoRefund) {
    throw new ApiError(
      400,
      `تنبيه: انقضت مهلة الاسترداد (${REFUND_WINDOW_HOURS} ساعة من وقت التسجيل). في حال الانسحاب الآن لن تسترد نقاطك (${paidAmount} MET). لتأكيد الانسحاب بدون استرداد أعد الطلب مع confirm=true`,
      ["REFUND_WINDOW_EXPIRED"]
    );
  }

  await enrollment.deleteOne();
  await Progress.findOneAndDelete({ studentId: student._id, courseId });
  await Student.findByIdAndUpdate(student._id, { $pull: { enrolledCourses: courseId } });
  await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: -1 } });

  // The refund reverses the instructor's share ONLY if the enrollment was
  // made under the current instructor; enrollments that predate his
  // assignment were already settled to the academy at handover time
  const enrolledUnderCurrentInstructor =
    !course.instructorAssignedAt ||
    new Date(enrollment.enrolledAt) >= new Date(course.instructorAssignedAt);

  if (refundable) {
    // Refund the student
    await Student.findByIdAndUpdate(student._id, {
      $inc:  { metPoints: paidAmount },
      $push: {
        metTransactions: {
          amount:      paidAmount,
          type:        "refund",
          description: `استرداد نقاط الانسحاب من كورس: ${course.title}`,
          courseId:    course._id,
        },
      },
    });

    // Reverse platform income with the same formulas used at enrollment
    const reservedAmount = Math.round(paidAmount * (course.reservedPercentage / 100));
    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalIncome: -paidAmount, totalReserved: -reservedAmount },
    });

    // Reverse the instructor's share
    if (course.instructorId && enrolledUnderCurrentInstructor) {
      const instructorEarning = Math.round(paidAmount * (course.instructorPercentage / 100));
      await InstructorFinance.findOneAndUpdate(
        { instructorId: course.instructorId },
        {
          $inc: { totalEarned: -instructorEarning, totalReserved: -reservedAmount },
          $push: {
            transactions: {
              courseId:    course._id,
              courseTitle: course.title,
              amount:      -instructorEarning,
              amountUSD:   -instructorEarning * MET_TO_USD,
              type:        "cancelled",
              note:        "انسحاب طالب خلال مهلة الاسترداد (48 ساعة)",
            },
          },
        },
        { upsert: true }
      );
    }
  }

  // Notify the course instructor about the withdrawal (refunded or not)
  if (course.instructorId) {
    const { notifyUser } = require("../../utils/notificationHelper");
    const instructor = await Instructor.findById(course.instructorId).select("userId");
    if (instructor?.userId) {
      const studentUser = await User.findById(userId).select("firstName familyName");
      const studentName = studentUser
        ? `${studentUser.firstName} ${studentUser.familyName}`
        : "أحد الطلاب";
      await notifyUser(
        instructor.userId,
        "student_dropped",
        "انسحاب طالب من الكورس",
        refundable
          ? enrolledUnderCurrentInstructor
            ? `انسحب الطالب ${studentName} من كورس "${course.title}" خلال مهلة الاسترداد — استُردت نقاطه (${paidAmount} MET) وتم خصم حصتك من أرباح هذا التسجيل`
            : `انسحب الطالب ${studentName} من كورس "${course.title}" خلال مهلة الاسترداد — استُردت نقاطه (${paidAmount} MET) وأرباحك لم تتأثر (تسجيله كان قبل تعيينك)`
          : `انسحب الطالب ${studentName} من كورس "${course.title}" بعد انتهاء مهلة الاسترداد — لم تُسترد النقاط وأرباحك لم تتأثر`,
        course._id,
        "Course"
      );
    }
  }

  return {
    refunded:       refundable,
    refundedAmount: refundable ? paidAmount : 0,
    message: refundable
      ? `تم الانسحاب من الكورس واسترداد ${paidAmount} MET إلى رصيدك`
      : paidAmount > 0
        ? "تم الانسحاب من الكورس بدون استرداد النقاط (انقضت مهلة الاسترداد)"
        : "تم الانسحاب من الكورس بنجاح",
  };
};

// ── COURSE CONTENT ────────────────────────────────────────
const getCourseContent = async (userId, courseId) => {
  const Lesson     = require("../lessons/lesson.model");
  const Assignment = require("../assignments/assignment.model");
  const Exam       = require("../exams/exam.model");

  const student    = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId,
    status: { $in: ["active", "completed"] },
  });
  if (!enrollment) throw new ApiError(403, "أنت غير مسجل في هذا الكورس");

  const course  = await Course.findById(courseId)
    .populate({ path: "instructorId", populate: { path: "userId", select: "firstName familyName profileImage" } });
  if (!course) throw new ApiError(404, "الكورس غير موجود");

  const now = new Date();
  const [lessons, assignments, exams, progress] = await Promise.all([
    Lesson.find({ courseId, isPublished: true }).sort({ order: 1 }),
    Assignment.find({ courseId }).sort({ createdAt: -1 }),
    Exam.find({
      courseId,
      isPublished: true,
      $or: [{ startTime: null }, { startTime: { $lte: now } }],
    }).select("-questions.correctAnswer").sort({ createdAt: -1 }),
    Progress.findOne({ studentId: student._id, courseId }),
  ]);

  return { course, lessons, assignments, exams, progress, enrollment };
};

// ── CHAT: instructor list ─────────────────────────────────
const getChatInstructors = async (userId) => {
  const student     = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollments = await Enrollment.find({
    studentId: student._id,
    status: { $in: ["active", "completed"] },
  })
    .populate({
      path: "courseId",
      select: "title thumbnail instructorId",
      populate: {
        path: "instructorId",
        populate: { path: "userId", select: "firstName secondName familyName email profileImage" },
      },
    });

  const instructorMap = new Map();
  enrollments.forEach((enr) => {
    const inst = enr.courseId?.instructorId;
    if (!inst) return;
    const key = inst.userId?._id?.toString();
    if (key && !instructorMap.has(key)) {
      instructorMap.set(key, { instructor: inst, courses: [] });
    }
    if (key) {
      instructorMap.get(key).courses.push({
        id: enr.courseId._id, title: enr.courseId.title, thumbnail: enr.courseId.thumbnail,
      });
    }
  });

  return Array.from(instructorMap.values());
};

// ── MET history ────────────────────────────────────────────
const getMetHistory = async (userId) => {
  const student = await Student.findOne({ userId })
    .populate("metTransactions.courseId", "title");
  if (!student) throw new ApiError(404, "الطالب غير موجود");
  return {
    currentMet:   student.metPoints,
    currentUSD:   student.metPoints * MET_TO_USD,
    transactions: student.metTransactions.reverse(),
  };
};

module.exports = {
  getStudentProfile, updateStudentProfile, getStudentDashboard, getAvailableCourses,
  enrollInCourse, dropCourse, getCourseContent,
  getChatInstructors, getMetHistory,
};
