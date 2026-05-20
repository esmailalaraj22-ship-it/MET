const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./assignment.service");

const createAssignment = asyncHandler(async (req, res) => {
  const a = await service.createAssignment(req.user._id, req.user.role, req.params.courseId, req.body);
  return ApiResponse.success(res, 201, "تم إضافة الواجب بنجاح", { assignment: a });
});
const getAssignments   = asyncHandler(async (req, res) => {
  const assignments = await service.getAssignments(req.params.courseId);
  return ApiResponse.success(res, 200, "قائمة الواجبات", { assignments });
});
const submitAssignment = asyncHandler(async (req, res) => {
  const sub = await service.submitAssignment(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, 201, "تم تسليم الواجب بنجاح", { submission: sub });
});
const getSubmissions   = asyncHandler(async (req, res) => {
  const data = await service.getSubmissions(req.user._id, req.user.role, req.params.id);
  return ApiResponse.success(res, 200, "تسليمات الواجب", data);
});
const gradeSubmission  = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  const sub = await service.gradeSubmission(req.user._id, req.user.role, req.params.submissionId, score, feedback);
  return ApiResponse.success(res, 200, "تم تصحيح الواجب بنجاح", { submission: sub });
});

module.exports = { createAssignment, getAssignments, submitAssignment, getSubmissions, gradeSubmission };