const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./instructor.service");

const getProfile     = asyncHandler(async (req, res) => {
  const data = await service.getInstructorProfile(req.user._id);
  return ApiResponse.success(res, 200, "الملف الشخصي", data);
});
const updateProfile  = asyncHandler(async (req, res) => {
  const instructor = await service.updateInstructorProfile(req.user._id, req.body);
  return ApiResponse.success(res, 200, "تم تحديث الملف الشخصي", { instructor });
});
const getDashboard   = asyncHandler(async (req, res) => {
  const data = await service.getInstructorDashboard(req.user._id);
  return ApiResponse.success(res, 200, "لوحة التحكم", data);
});
const getCourseStudents = asyncHandler(async (req, res) => {
  const { students, pagination } = await service.getCourseStudents(req.user._id, req.params.courseId, req.query);
  return ApiResponse.paginated(res, "طلاب الكورس", students, pagination);
});
const getFinance     = asyncHandler(async (req, res) => {
  const data = await service.getFinancialDashboard(req.user._id);
  return ApiResponse.success(res, 200, "التقرير المالي", data);
});

module.exports = { getProfile, updateProfile, getDashboard, getCourseStudents, getFinance };