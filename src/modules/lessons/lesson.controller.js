const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const ApiError     = require("../../utils/ApiError");
const fs           = require("fs/promises");
const service      = require("./lesson.service");

const removeUploadedFile = async (file) => {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
};

const createLesson = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "ملف الفيديو مطلوب");

  try {
    const data = {
      ...req.body,
      videoUrl: `/uploads/videos/${req.file.filename}`,
    };
    const lesson = await service.createLesson(req.user._id, req.user.role, req.params.courseId, data);
    return ApiResponse.success(res, 201, "تم رفع الفيديو وإضافة الدرس بنجاح", { lesson });
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
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
  try {
    const data = { ...req.body };
    if (req.file) data.videoUrl = `/uploads/videos/${req.file.filename}`;
    const lesson = await service.updateLesson(req.user._id, req.user.role, req.params.courseId, req.params.id, data);
    return ApiResponse.success(res, 200, "تم تحديث الدرس بنجاح", { lesson });
  } catch (error) {
    await removeUploadedFile(req.file);
    throw error;
  }
});

const deleteLesson = asyncHandler(async (req, res) => {
  await service.deleteLesson(req.user._id, req.user.role, req.params.courseId, req.params.id);
  return ApiResponse.success(res, 200, "تم حذف الدرس بنجاح");
});

module.exports = { createLesson, getLessons, getLessonById, updateLesson, deleteLesson };
