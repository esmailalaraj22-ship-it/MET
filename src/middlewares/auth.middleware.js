const { verifyToken } = require("../utils/generateToken");
const ApiError = require("../utils/ApiError");
const User = require("../modules/users/user.model");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError(401, "غير مصرح. يرجى تسجيل الدخول أولاً"));
  }

  let decoded;
  try {
    decoded = verifyToken(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError(401, "الرمز المميز غير صالح أو منتهي الصلاحية"));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ApiError(401, "المستخدم المرتبط بهذا الرمز غير موجود"));
  }

  if (!user.isActive) {
    return next(new ApiError(403, "حسابك معطّل. تواصل مع الإدارة للمساعدة"));
  }

  req.user = user;
  next();
});

module.exports = { protect };