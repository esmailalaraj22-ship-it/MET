const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const University   = require("./university.model");

// @desc  Get all active universities (for student registration dropdown)
// @route GET /api/v1/universities
// @access Public
const getPublicUniversities = asyncHandler(async (req, res) => {
  const universities = await University.find({ isActive: true })
    .select("name nameEn city logo")
    .sort({ name: 1 });
  return ApiResponse.success(res, 200, "الجامعات المتاحة", { universities });
});

module.exports = { getPublicUniversities };