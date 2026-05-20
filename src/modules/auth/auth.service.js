const User = require("../users/user.model");
const Student = require("../students/student.model");
const University = require("../universities/university.model");
const { generateAccessToken, generateRefreshToken, verifyToken } = require("../../utils/generateToken");
const ApiError = require("../../utils/ApiError");

/**
 * Register a new student account
 * Students register themselves — instructors are created by admin only
 */
const registerStudent = async (data) => {
  const { firstName, secondName, familyName, email, password, universityId } = data;

  // 1. Check email uniqueness
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "البريد الإلكتروني مستخدم مسبقاً");

  // 2. Verify university exists and is active
  const university = await University.findById(universityId);
  if (!university) throw new ApiError(404, "الجامعة المحددة غير موجودة");
  if (!university.isActive) throw new ApiError(400, "الجامعة المحددة غير متاحة حالياً");

  // 3. Create user account
  const user = await User.create({
    firstName, secondName, familyName, email, password,
    role: "student",
    isActive: true,
    isVerified: true,
  });

  // 4. Create student profile linked to university
  const student = await Student.create({
    userId: user._id,
    universityId: university._id,
  });

  return { user, student, university };
};

/**
 * Login for all roles (student, instructor, admin)
 */
const loginUser = async (email, password) => {
  // Select password explicitly (it's excluded by default)
  const user = await User.findOne({ email }).select("+password +refreshToken");

  if (!user) throw new ApiError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  if (!user.isActive) throw new ApiError(403, "حسابك معطّل. تواصل مع الإدارة");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const tokenPayload = { id: user._id, role: user.role };
  const accessToken  = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Persist refresh token for revocation support
  user.refreshToken = refreshToken;
  user.lastLoginAt  = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/**
 * Refresh access token using stored refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(401, "رمز التحديث مطلوب");

  let decoded;
  try {
    decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, "رمز التحديث غير صالح أو منتهي الصلاحية");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, "رمز التحديث غير مطابق. يرجى تسجيل الدخول مجدداً");
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  return { accessToken };
};

/**
 * Logout: invalidate refresh token in DB
 */
const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

/**
 * Change password — requires current password verification
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new ApiError(404, "المستخدم غير موجود");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, "كلمة المرور الحالية غير صحيحة");

  user.password = newPassword;
  await user.save();
};

module.exports = {
  registerStudent,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changePassword,
};