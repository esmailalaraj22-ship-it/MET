const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./admin.service");

// Profile
const getProfile    = asyncHandler(async (req, res) => {
  const data = await service.getAdminProfile(req.user._id);
  return ApiResponse.success(res, 200, "بيانات الأدمن", data);
});
const updateProfile = asyncHandler(async (req, res) => {
  const user = await service.updateAdminProfile(req.user._id, req.body);
  return ApiResponse.success(res, 200, "تم تحديث الملف الشخصي", { user });
});

// Stats
const getStats = asyncHandler(async (req, res) => {
  const stats = await service.getPlatformStats();
  return ApiResponse.success(res, 200, "إحصائيات المنصة", stats);
});

// Universities
const createUniversity = asyncHandler(async (req, res) => {
  const u = await service.createUniversity(req.body, req.user._id);
  return ApiResponse.success(res, 201, "تم إنشاء الجامعة بنجاح", { university: u });
});
const getUniversities = asyncHandler(async (req, res) => {
  const { universities, pagination } = await service.getAllUniversities(req.query);
  return ApiResponse.paginated(res, "قائمة الجامعات", universities, pagination);
});
const toggleUniversity = asyncHandler(async (req, res) => {
  const u = await service.toggleUniversityStatus(req.params.id);
  return ApiResponse.success(res, 200, "تم تحديث حالة الجامعة", { university: u });
});
const deleteUniversity = asyncHandler(async (req, res) => {
  await service.deleteUniversity(req.params.id);
  return ApiResponse.success(res, 200, "تم حذف الجامعة بنجاح");
});

// Instructors
const createInstructor = asyncHandler(async (req, res) => {
  const data = await service.createInstructor(req.body, req.user._id);
  return ApiResponse.success(res, 201, "تم إنشاء حساب المدرس بنجاح", data);
});
const getInstructors = asyncHandler(async (req, res) => {
  const { instructors, pagination } = await service.getAllInstructors(req.query);
  return ApiResponse.paginated(res, "قائمة المدرسين", instructors, pagination);
});
const getInstructorById = asyncHandler(async (req, res) => {
  const inst = await service.getInstructorById(req.params.id);
  return ApiResponse.success(res, 200, "بيانات المدرس", { instructor: inst });
});
const updateInstructor = asyncHandler(async (req, res) => {
  const instructor = await service.updateInstructor(req.params.id, req.body);
  return ApiResponse.success(res, 200, "تم تحديث بيانات المدرس", { instructor });
});
const toggleInstructor = asyncHandler(async (req, res) => {
  const result = await service.toggleInstructorStatus(req.params.id);
  return ApiResponse.success(res, 200, result.isActive ? "تم تفعيل المدرس" : "تم تعطيل المدرس", result);
});

// Students
const getStudents = asyncHandler(async (req, res) => {
  const { students, pagination } = await service.getAllStudents(req.query);
  return ApiResponse.paginated(res, "قائمة الطلاب", students, pagination);
});
const updateStudent = asyncHandler(async (req, res) => {
  const student = await service.updateStudent(req.params.id, req.body);
  return ApiResponse.success(res, 200, "تم تحديث بيانات الطالب", { student });
});
const toggleStudent = asyncHandler(async (req, res) => {
  const result = await service.toggleStudentStatus(req.params.id);
  return ApiResponse.success(res, 200, result.isActive ? "تم تفعيل الطالب" : "تم تعطيل الطالب", result);
});
const applyDiscount = asyncHandler(async (req, res) => {
  const student = await service.applyDiscount(req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, 200, "تم تطبيق الخصم بنجاح", { student });
});
const addMet = asyncHandler(async (req, res) => {
  const result = await service.addMetToStudent(req.params.id, req.body.amount, req.body.description, req.user._id);
  return ApiResponse.success(res, 200, "تم إضافة نقاط MET بنجاح", result);
});

// Courses
const createCourse = asyncHandler(async (req, res) => {
  const course = await service.createCourse(req.body, req.user._id);
  return ApiResponse.success(res, 201, "تم إنشاء الكورس بنجاح", { course });
});
const getCourses = asyncHandler(async (req, res) => {
  const { courses, pagination } = await service.getAllCourses(req.query);
  return ApiResponse.paginated(res, "قائمة الكورسات", courses, pagination);
});
const getCourseDetails = asyncHandler(async (req, res) => {
  const course = await service.getCourseDetails(req.params.id);
  return ApiResponse.success(res, 200, "تفاصيل الكورس", { course });
});
const assignInstructor = asyncHandler(async (req, res) => {
  const course = await service.assignInstructorToCourse(req.params.id, req.body.instructorId);
  return ApiResponse.success(res, 200, "تم تعيين المدرس بنجاح", { course });
});
const deleteCourse = asyncHandler(async (req, res) => {
  await service.deleteCourse(req.params.id);
  return ApiResponse.success(res, 200, "تم حذف الكورس بنجاح");
});
const getCourseStudents = asyncHandler(async (req, res) => {
  const { enrollments, pagination } = await service.getCourseStudents(req.params.id, req.query);
  return ApiResponse.paginated(res, "طلاب الكورس", enrollments, pagination);
});
const removeStudentFromCourse = asyncHandler(async (req, res) => {
  await service.removeStudentFromCourse(req.params.courseId, req.params.studentId);
  return ApiResponse.success(res, 200, "تم إزالة الطالب من الكورس بنجاح");
});
const removeAllStudents = asyncHandler(async (req, res) => {
  const count = await service.removeAllStudentsFromCourse(req.params.id);
  return ApiResponse.success(res, 200, `تم إزالة ${count} طالب من الكورس`);
});

// Finance
const getPayments = asyncHandler(async (req, res) => {
  const { instructors, pagination } = await service.getInstructorPayments(req.query);
  return ApiResponse.paginated(res, "مستحقات المدرسين", instructors, pagination);
});
const releasePayment = asyncHandler(async (req, res) => {
  const result = await service.releasePayment(req.params.instructorId, req.body.amount, req.body.note, req.user._id);
  return ApiResponse.success(res, 200, result.message, result.finance);
});
const cancelPayment = asyncHandler(async (req, res) => {
  const result = await service.cancelPayment(req.params.instructorId, req.body.amount, req.body.note, req.user._id);
  return ApiResponse.success(res, 200, result.message, result.finance);
});

// Notifications
const broadcastNotification = asyncHandler(async (req, res) => {
  const count = await service.broadcastNotification(req.body);
  return ApiResponse.success(res, 200, `تم إرسال الإشعار لـ ${count} مستخدم`);
});

module.exports = {
  getProfile, updateProfile, getStats,
  createUniversity, getUniversities, toggleUniversity, deleteUniversity,
  createInstructor, getInstructors, getInstructorById, updateInstructor, toggleInstructor,
  getStudents, updateStudent, toggleStudent, applyDiscount, addMet,
  createCourse, getCourses, getCourseDetails, assignInstructor,
  deleteCourse, getCourseStudents, removeStudentFromCourse, removeAllStudents,
  getPayments, releasePayment, cancelPayment,
  broadcastNotification,
};
