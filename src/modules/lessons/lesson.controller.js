const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./lesson.service");

const createLesson = asyncHandler(async (req, res) => {
  const lesson = await service.createLesson(req.user._id, req.user.role, req.params.courseId, req.body);
  return ApiResponse.success(res, 201, "تم إضافة الدرس بنجاح", { lesson });
});

const getLessons = asyncHandler(async (req, res) => {
  const lessons = await service.getLessons(req.params.courseId);
  return ApiResponse.success(res, 200, "قائمة الدروس", { lessons });
});

const getLessonById = asyncHandler(async (req, res) => {
  const lesson = await service.getLessonById(req.params.courseId, req.params.id);
  return ApiResponse.success(res, 200, "تفاصيل الدرس", { lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await service.updateLesson(req.user._id, req.user.role, req.params.courseId, req.params.id, req.body);
  return ApiResponse.success(res, 200, "تم تحديث الدرس بنجاح", { lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  await service.deleteLesson(req.user._id, req.user.role, req.params.courseId, req.params.id);
  return ApiResponse.success(res, 200, "تم حذف الدرس بنجاح");
});

module.exports = { createLesson, getLessons, getLessonById, updateLesson, deleteLesson };