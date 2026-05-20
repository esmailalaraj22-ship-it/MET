const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./exam.service");

const createExam          = asyncHandler(async (req, res) => {
  const exam = await service.createExam(req.user._id, req.user.role, req.params.courseId, req.body);
  return ApiResponse.success(res, 201, "تم إنشاء الاختبار بنجاح", { exam });
});
const getExams            = asyncHandler(async (req, res) => {
  const exams = await service.getExams(req.user._id, req.user.role, req.params.courseId);
  return ApiResponse.success(res, 200, "قائمة الاختبارات", { exams });
});
const getExamById         = asyncHandler(async (req, res) => {
  const exam = await service.getExamById(req.user._id, req.user.role, req.params.courseId, req.params.id);
  return ApiResponse.success(res, 200, "تفاصيل الاختبار", { exam });
});
const submitExam          = asyncHandler(async (req, res) => {
  const { answers, timeTaken } = req.body;
  const data = await service.submitExam(req.user._id, req.params.courseId, req.params.id, answers, timeTaken);
  return ApiResponse.success(res, 200, data.message, data);
});
const getResults          = asyncHandler(async (req, res) => {
  const data = await service.getExamResults(req.user._id, req.user.role, req.params.courseId, req.params.id, req.query);
  return ApiResponse.success(res, 200, "نتائج الاختبار", data);
});
const getMyResult         = asyncHandler(async (req, res) => {
  const result = await service.getMyResult(req.user._id, req.params.id);
  return ApiResponse.success(res, 200, "نتيجتك", { result });
});
const gradeWrittenAnswers = asyncHandler(async (req, res) => {
  const result = await service.gradeWrittenAnswers(req.user._id, req.user.role, req.params.resultId, req.body.grades);
  return ApiResponse.success(res, 200, "تم تصحيح الإجابات المكتوبة", { result });
});
const modifyScore         = asyncHandler(async (req, res) => {
  const result = await service.modifyScore(req.user._id, req.user.role, req.params.resultId, req.body.newScore);
  return ApiResponse.success(res, 200, "تم تعديل الدرجة بنجاح", { result });
});
const releaseGrades       = asyncHandler(async (req, res) => {
  const data = await service.releaseGrades(req.user._id, req.user.role, req.params.id);
  return ApiResponse.success(res, 200, data.message);
});

module.exports = {
  createExam, getExams, getExamById, submitExam,
  getResults, getMyResult, gradeWrittenAnswers, modifyScore, releaseGrades,
};