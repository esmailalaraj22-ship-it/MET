const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./progress.service");

const markLesson = asyncHandler(async (req, res) => {
  const progress = await service.markLessonCompleted(req.user._id, req.params.courseId, req.params.lessonId);
  return ApiResponse.success(res, 200, "تم تحديث التقدم", { progress });
});

const getCourseProgress = asyncHandler(async (req, res) => {
  const progress = await service.getCourseProgress(req.user._id, req.params.courseId);
  return ApiResponse.success(res, 200, "تقدمك في الكورس", { progress });
});

const getOverview = asyncHandler(async (req, res) => {
  const overview = await service.getProgressOverview(req.user._id);
  return ApiResponse.success(res, 200, "نظرة عامة على تقدمك", { overview });
});

module.exports = { markLesson, getCourseProgress, getOverview };