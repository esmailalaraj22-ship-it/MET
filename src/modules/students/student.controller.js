const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./student.service");

const getProfile          = asyncHandler(async (req, res) => {
  const student = await service.getStudentProfile(req.user._id);
  return ApiResponse.success(res, 200, "الملف الشخصي", { student });
});
const getDashboard        = asyncHandler(async (req, res) => {
  const data = await service.getStudentDashboard(req.user._id);
  return ApiResponse.success(res, 200, "لوحة التحكم", data);
});
const getAvailableCourses = asyncHandler(async (req, res) => {
  const { courses, pagination, myMetPoints } = await service.getAvailableCourses(req.user._id, req.query);
  return ApiResponse.paginated(res, "الكورسات المتاحة", courses, { ...pagination, myMetPoints });
});
const enrollInCourse      = asyncHandler(async (req, res) => {
  const result = await service.enrollInCourse(req.user._id, req.params.courseId);
  return ApiResponse.success(res, 201, result.message, result);
});
const dropCourse          = asyncHandler(async (req, res) => {
  await service.dropCourse(req.user._id, req.params.courseId);
  return ApiResponse.success(res, 200, "تم الانسحاب من الكورس بنجاح");
});
const getCourseContent    = asyncHandler(async (req, res) => {
  const data = await service.getCourseContent(req.user._id, req.params.courseId);
  return ApiResponse.success(res, 200, "محتوى الكورس", data);
});
const getChatInstructors  = asyncHandler(async (req, res) => {
  const instructors = await service.getChatInstructors(req.user._id);
  return ApiResponse.success(res, 200, "المدرسون المتاحون للمحادثة", { instructors });
});
const getMetHistory       = asyncHandler(async (req, res) => {
  const data = await service.getMetHistory(req.user._id);
  return ApiResponse.success(res, 200, "سجل نقاط MET", data);
});

module.exports = {
  getProfile, getDashboard, getAvailableCourses,
  enrollInCourse, dropCourse, getCourseContent,
  getChatInstructors, getMetHistory,
};