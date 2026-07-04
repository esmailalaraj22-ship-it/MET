const User              = require("../users/user.model");
const Admin             = require("./admin.model");
const Instructor        = require("../instructors/instructor.model");
const Student           = require("../students/student.model");
const University        = require("../universities/university.model");
const Course            = require("../courses/course.model");
const Enrollment        = require("../enrollments/enrollment.model");
const Notification      = require("../notifications/notification.model");
const InstructorFinance = require("../finance/instructorFinance.model");
const ApiError          = require("../../utils/ApiError");
const { encryptData }   = require("../../utils/hashData");
const { broadcastToAll } = require("../../utils/notificationHelper");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

const MET_TO_USD = 2;

// ── PROFILE ───────────────────────────────────────────────
const getAdminProfile = async (userId) => {
  const user  = await User.findById(userId);
  if (!user) throw new ApiError(404, "الأدمن غير موجود");
  const admin = await Admin.findOne({ userId });
  return { user, admin };
};

const updateAdminProfile = async (userId, updates) => {
  const allowed = ["firstName", "secondName", "familyName", "profileImage"];
  const data = {};
  allowed.forEach((f) => { if (updates[f] !== undefined) data[f] = updates[f]; });
  const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, "الأدمن غير موجود");
  return user;
};

// ── UNIVERSITIES ──────────────────────────────────────────
const createUniversity = async (data, adminUserId) => {
  const existing = await University.findOne({ name: data.name });
  if (existing) throw new ApiError(409, "اسم الجامعة مستخدم مسبقاً");
  return await University.create({ ...data, createdBy: adminUserId });
};

const getAllUniversities = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = query.search ? { $text: { $search: query.search } } : {};
  const [universities, total] = await Promise.all([
    University.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    University.countDocuments(filter),
  ]);
  return { universities, pagination: getPaginationMeta(total, page, limit) };
};

const toggleUniversityStatus = async (id) => {
  const u = await University.findById(id);
  if (!u) throw new ApiError(404, "الجامعة غير موجودة");
  u.isActive = !u.isActive;
  await u.save();
  return u;
};

const deleteUniversity = async (id) => {
  const u     = await University.findById(id);
  if (!u) throw new ApiError(404, "الجامعة غير موجودة");
  const count = await Student.countDocuments({ universityId: id });
  if (count > 0) throw new ApiError(400, `لا يمكن الحذف: ${count} طالب مرتبط بهذه الجامعة`);
  await University.findByIdAndDelete(id);
};

// ── INSTRUCTORS ───────────────────────────────────────────
const createInstructor = async (data, adminUserId) => {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new ApiError(409, "البريد الإلكتروني مستخدم مسبقاً");

  const encryptedNationalId = encryptData(data.nationalId);

  const user = await User.create({
    firstName: data.firstName, secondName: data.secondName, familyName: data.familyName,
    email: data.email, password: data.password, role: "instructor",
    profileImage: data.profileImage || null,
    isActive: true, isVerified: true,
  });

  const instructor = await Instructor.create({
    userId:        user._id,
    nationalId:    encryptedNationalId,
    phoneNumber:   data.phoneNumber   || null,
    dateOfBirth:   data.dateOfBirth   || null,
    paypalAccount: data.paypalAccount || null,
    bio:           data.bio           || "",
    createdBy:     adminUserId,
  });

  // Init finance record
  await InstructorFinance.create({ instructorId: instructor._id });

  return { user, instructor };
};

const getAllInstructors = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.search) {
    const users = await User.find({
      role: "instructor",
      $or: [
        { firstName: { $regex: query.search, $options: "i" } },
        { familyName: { $regex: query.search, $options: "i" } },
        { email:      { $regex: query.search, $options: "i" } },
      ],
    }).select("_id");
    filter.userId = { $in: users.map((u) => u._id) };
  }
  const [instructors, total] = await Promise.all([
    Instructor.find(filter)
      .populate("userId", "firstName secondName familyName email profileImage isActive createdAt")
      .populate("assignedCourses", "title enrolledCount isPublished metCost")
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Instructor.countDocuments(filter),
  ]);
  return { instructors, pagination: getPaginationMeta(total, page, limit) };
};

const getInstructorById = async (id) => {
  const inst = await Instructor.findById(id)
    .populate("userId", "firstName secondName familyName email profileImage isActive createdAt")
    .populate("assignedCourses", "title enrolledCount totalIncome isPublished metCost");
  if (!inst) throw new ApiError(404, "المدرس غير موجود");
  return inst;
};

const toggleInstructorStatus = async (id) => {
  const inst = await Instructor.findById(id);
  if (!inst) throw new ApiError(404, "المدرس غير موجود");
  const user = await User.findById(inst.userId);
  user.isActive = !user.isActive;
  await user.save();
  return { isActive: user.isActive };
};

// ── STUDENTS ──────────────────────────────────────────────
const getAllStudents = async (query) => {
  const { page, limit, skip } = getPagination(query);
  let userFilter = { role: "student" };
  if (query.email) userFilter.email = { $regex: query.email, $options: "i" };
  if (query.name)  userFilter.$or   = [
    { firstName: { $regex: query.name, $options: "i" } },
    { familyName: { $regex: query.name, $options: "i" } },
  ];
  const matchUsers = await User.find(userFilter).select("_id");
  const stuFilter  = { userId: { $in: matchUsers.map((u) => u._id) } };
  if (query.universityId) stuFilter.universityId = query.universityId;

  const [students, total] = await Promise.all([
    Student.find(stuFilter)
      .populate("userId",       "firstName secondName familyName email profileImage isActive createdAt")
      .populate("universityId", "name city")
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Student.countDocuments(stuFilter),
  ]);
  return { students, pagination: getPaginationMeta(total, page, limit) };
};

const toggleStudentStatus = async (id) => {
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, "الطالب غير موجود");
  const user = await User.findById(student.userId);
  user.isActive = !user.isActive;
  await user.save();
  return { isActive: user.isActive };
};

const applyDiscount = async (studentId, discountData, adminUserId) => {
  if (discountData.type === "percentage" && discountData.value > 100)
    throw new ApiError(400, "نسبة الخصم لا يمكن أن تتجاوز 100%");
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "الطالب غير موجود");
  student.discount = { ...discountData, appliedBy: adminUserId, appliedAt: new Date() };
  await student.save();
  return student;
};

// Admin can add MET points to a student (manually)
const addMetToStudent = async (studentId, amount, description, adminUserId) => {
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, "الطالب غير موجود");
  student.metPoints += amount;
  student.metTransactions.push({
    amount, type: "credit",
    description: description || `أضاف الأدمن ${amount} MET`,
  });
  await student.save();
  return { metPoints: student.metPoints, added: amount };
};

// ── COURSES ───────────────────────────────────────────────
const createCourse = async (data, adminUserId) => {
  const slugify = require("slugify");
  if (data.instructorId) {
    const inst = await Instructor.findById(data.instructorId);
    if (!inst) throw new ApiError(404, "المدرس غير موجود");
  }
  const universities = await University.find({ _id: { $in: data.allowedUniversities } });
  if (universities.length !== data.allowedUniversities.length)
    throw new ApiError(400, "بعض الجامعات المحددة غير موجودة");

  const slug   = slugify(data.title, { lower: true, strict: true }) + "-" + Date.now();
  const course = await Course.create({
    ...data,
    slug,
    createdBy: adminUserId,
    isPublished: true,
  });

  if (data.instructorId) {
    await Instructor.findByIdAndUpdate(data.instructorId, {
      $addToSet: { assignedCourses: course._id },
    });
  }
  return course;
};

const getAllCourses = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.search)       filter.$text = { $search: query.search };
  if (query.universityId) filter.allowedUniversities = query.universityId;
  if (query.instructorId) filter.instructorId = query.instructorId;

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate({ path: "instructorId", populate: { path: "userId", select: "firstName familyName" } })
      .populate("allowedUniversities", "name")
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Course.countDocuments(filter),
  ]);
  return { courses, pagination: getPaginationMeta(total, page, limit) };
};

const getCourseDetails = async (id) => {
  const course = await Course.findById(id)
    .populate({ path: "instructorId", populate: { path: "userId", select: "firstName secondName familyName email profileImage" } })
    .populate("allowedUniversities", "name city")
    .populate("createdBy", "firstName familyName");
  if (!course) throw new ApiError(404, "الكورس غير موجود");
  return course;
};

const assignInstructorToCourse = async (courseId, instructorId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "الكورس غير موجود");
  const inst   = await Instructor.findById(instructorId);
  if (!inst)   throw new ApiError(404, "المدرس غير موجود");

  if (course.instructorId && course.instructorId.toString() !== instructorId) {
    await Instructor.findByIdAndUpdate(course.instructorId, { $pull: { assignedCourses: course._id } });
  }
  course.instructorId = instructorId;
  await course.save();
  await Instructor.findByIdAndUpdate(instructorId, { $addToSet: { assignedCourses: course._id } });
  return course;
};

const deleteCourse = async (id) => {
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, "الكورس غير موجود");
  if (course.instructorId) {
    await Instructor.findByIdAndUpdate(course.instructorId, { $pull: { assignedCourses: course._id } });
  }
  await Course.findByIdAndDelete(id);
};

const getCourseStudents = async (courseId, query) => {
  const { page, limit, skip } = getPagination(query);
  const [enrollments, total]  = await Promise.all([
    Enrollment.find({ courseId, status: "active" })
      .populate({ path: "studentId", populate: { path: "userId", select: "firstName secondName familyName email profileImage" } })
      .skip(skip).limit(limit).sort({ enrolledAt: -1 }),
    Enrollment.countDocuments({ courseId, status: "active" }),
  ]);
  return { enrollments, pagination: getPaginationMeta(total, page, limit) };
};

const removeStudentFromCourse = async (courseId, studentId) => {
  const enrollment = await Enrollment.findOne({ courseId, studentId });
  if (!enrollment) throw new ApiError(404, "الطالب غير مسجل في هذا الكورس");
  await enrollment.deleteOne();
  await Student.findByIdAndUpdate(studentId, { $pull: { enrolledCourses: courseId } });
  await Course.findByIdAndUpdate(courseId,   { $inc:  { enrolledCount: -1 } });
};

const removeAllStudentsFromCourse = async (courseId) => {
  const enrollments = await Enrollment.find({ courseId });
  const studentIds  = enrollments.map((e) => e.studentId);
  await Student.updateMany({ _id: { $in: studentIds } }, { $pull: { enrolledCourses: courseId } });
  const count = await Enrollment.countDocuments({ courseId });
  await Enrollment.deleteMany({ courseId });
  await Course.findByIdAndUpdate(courseId, { enrolledCount: 0 });
  return count;
};

// ── STATS ─────────────────────────────────────────────────
const getPlatformStats = async () => {
  const [totalStudents, totalInstructors, totalCourses, totalUniversities] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "instructor" }),
    Course.countDocuments(),
    University.countDocuments({ isActive: true }),
  ]);

  const courses = await Course.find()
    .select("title enrolledCount totalIncome totalReserved metCost instructorPercentage reservedPercentage")
    .sort({ enrolledCount: -1 }).limit(10);

  const totalIncomeMET  = courses.reduce((s, c) => s + (c.totalIncome    || 0), 0);
  const totalReservedMET= courses.reduce((s, c) => s + (c.totalReserved  || 0), 0);
  const netProfitMET    = totalIncomeMET - totalReservedMET;

  return {
    totalStudents, totalInstructors, totalCourses, totalUniversities,
    finance: {
      totalIncomeMET,  totalIncomeUSD:   totalIncomeMET   * MET_TO_USD,
      totalReservedMET,totalReservedUSD: totalReservedMET * MET_TO_USD,
      netProfitMET,    netProfitUSD:     netProfitMET     * MET_TO_USD,
    },
    topCourses: courses,
  };
};

// ── FINANCE: INSTRUCTOR PAYMENTS ─────────────────────────
const getInstructorPayments = async (query) => {
  const { page, limit, skip } = getPagination(query);
  let filter = {};
  if (query.search) {
    const users = await User.find({
      role: "instructor",
      $or: [
        { firstName: { $regex: query.search, $options: "i" } },
        { familyName: { $regex: query.search, $options: "i" } },
      ],
    }).select("_id");
    filter.userId = { $in: users.map((u) => u._id) };
  }

  const [instructors, total] = await Promise.all([
    Instructor.find(filter)
      .populate("userId", "firstName secondName familyName email")
      .populate("assignedCourses", "title totalIncome metCost instructorPercentage reservedPercentage enrolledCount")
      .skip(skip).limit(limit),
    Instructor.countDocuments(filter),
  ]);

  const result = await Promise.all(instructors.map(async (inst) => {
    const finance = await InstructorFinance.findOne({ instructorId: inst._id });
    const courses = (inst.assignedCourses || []).map((c) => {
      const earned   = Math.round(c.totalIncome * c.instructorPercentage / 100);
      const reserved = Math.round(c.totalIncome * c.reservedPercentage   / 100);
      return {
        courseId: c._id, title: c.title, totalIncome: c.totalIncome,
        earnedMET: earned, earnedUSD: earned * MET_TO_USD,
        reservedMET: reserved, reservedUSD: reserved * MET_TO_USD,
        enrolledCount: c.enrolledCount,
      };
    });

    return {
      instructorId:  inst._id,
      instructor:    inst.userId,
      paypalAccount: inst.paypalAccount,
      totalEarnedMET:   finance?.totalEarned   || 0,
      totalEarnedUSD:   (finance?.totalEarned  || 0) * MET_TO_USD,
      totalReservedMET: finance?.totalReserved || 0,
      totalReservedUSD: (finance?.totalReserved|| 0) * MET_TO_USD,
      totalReleasedMET: finance?.totalReleased || 0,
      courses,
    };
  }));

  return { instructors: result, pagination: getPaginationMeta(total, page, limit) };
};

// ── RELEASE / CANCEL PAYMENT ──────────────────────────────
const releasePayment = async (instructorId, amount, note, adminUserId) => {
  const instructor = await Instructor.findById(instructorId);
  if (!instructor) throw new ApiError(404, "المدرس غير موجود");

  const finance = await InstructorFinance.findOne({ instructorId });
  if (!finance)  throw new ApiError(404, "السجل المالي غير موجود");
  if (finance.totalReserved < amount)
    throw new ApiError(400, `المبلغ المطلوب ${amount} MET يتجاوز المحجوز ${finance.totalReserved} MET`);

  finance.totalReserved -= amount;
  finance.totalReleased += amount;
  finance.transactions.push({
    amount, amountUSD: amount * MET_TO_USD,
    type: "released", releasedBy: adminUserId,
    note: note || "إطلاق مدفوعات من الأدمن",
  });
  await finance.save();
  return { message: `تم إطلاق ${amount} MET (${amount * MET_TO_USD} USD)`, finance };
};

const cancelPayment = async (instructorId, amount, note, adminUserId) => {
  const finance = await InstructorFinance.findOne({ instructorId });
  if (!finance) throw new ApiError(404, "السجل المالي غير موجود");
  if (finance.totalReserved < amount)
    throw new ApiError(400, "المبلغ المطلوب يتجاوز المحجوز");

  finance.totalReserved -= amount;
  finance.transactions.push({
    amount, amountUSD: amount * MET_TO_USD,
    type: "cancelled", releasedBy: adminUserId,
    note: note || "إلغاء مدفوعات من الأدمن",
  });
  await finance.save();
  return { message: `تم إلغاء ${amount} MET`, finance };
};

// ── NOTIFICATIONS ─────────────────────────────────────────
const broadcastNotification = async (data) =>
  await broadcastToAll(User, data.type || "system", data.title, data.body);

module.exports = {
  getAdminProfile, updateAdminProfile,
  createUniversity, getAllUniversities, toggleUniversityStatus, deleteUniversity,
  createInstructor, getAllInstructors, getInstructorById, toggleInstructorStatus,
  getAllStudents, toggleStudentStatus, applyDiscount, addMetToStudent,
  createCourse, getAllCourses, getCourseDetails, assignInstructorToCourse,
  deleteCourse, getCourseStudents, removeStudentFromCourse, removeAllStudentsFromCourse,
  getPlatformStats, getInstructorPayments, releasePayment, cancelPayment,
  broadcastNotification,
};
