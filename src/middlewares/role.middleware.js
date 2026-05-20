const ApiError = require("../utils/ApiError");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "يجب تسجيل الدخول أولاً"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `الدور '${req.user.role}' ليس لديه صلاحية الوصول لهذا المورد`
        )
      );
    }
    next();
  };
};

module.exports = { authorize };