const asyncHandler  = require("../../utils/asyncHandler");
const ApiResponse   = require("../../utils/ApiResponse");
const authService   = require("./auth.service");

// @desc  Register student
// @route POST /api/v1/auth/register
// @access Public
const register = asyncHandler(async (req, res) => {
  const { user, student, university } = await authService.registerStudent(req.body);

  return ApiResponse.success(res, 201, "تم إنشاء الحساب بنجاح", {
    user: {
      id:           user._id,
      fullName:     user.fullName,
      email:        user.email,
      role:         user.role,
      profileImage: user.profileImage,
    },
    university: { id: university._id, name: university.name },
  });
});

// @desc  Login
// @route POST /api/v1/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

  // Store refresh token as httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });

  return ApiResponse.success(res, 200, "تم تسجيل الدخول بنجاح", {
    accessToken,
    user: {
      id:           user._id,
      fullName:     user.fullName,
      email:        user.email,
      role:         user.role,
      profileImage: user.profileImage,
    },
  });
});

// @desc  Refresh token
// @route POST /api/v1/auth/refresh-token
// @access Public
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  const { accessToken } = await authService.refreshAccessToken(token);
  return ApiResponse.success(res, 200, "تم تجديد الرمز المميز بنجاح", { accessToken });
});

// @desc  Logout
// @route POST /api/v1/auth/logout
// @access Protected
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  res.clearCookie("refreshToken");
  return ApiResponse.success(res, 200, "تم تسجيل الخروج بنجاح");
});

// @desc  Change password
// @route POST /api/v1/auth/change-password
// @access Protected
const changePasswordCtrl = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  return ApiResponse.success(res, 200, "تم تغيير كلمة المرور بنجاح");
});

// @desc  Get current logged-in user
// @route GET /api/v1/auth/me
// @access Protected
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, "بيانات المستخدم الحالي", {
    user: {
      id:           req.user._id,
      fullName:     req.user.fullName,
      email:        req.user.email,
      role:         req.user.role,
      profileImage: req.user.profileImage,
      isActive:     req.user.isActive,
    },
  });
});

module.exports = { register, login, refreshToken, logout, changePasswordCtrl, getMe };