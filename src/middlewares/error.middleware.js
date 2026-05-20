const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  let error = Object.assign(new ApiError(err.statusCode || 500, err.message), err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new ApiError(409, `القيمة المدخلة في حقل '${field}' مستخدمة مسبقاً`);
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, "خطأ في التحقق من البيانات", messages);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    error = new ApiError(400, `المعرف '${err.value}' غير صالح`);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") error = new ApiError(401, "رمز المصادقة غير صالح");
  if (err.name === "TokenExpiredError") error = new ApiError(401, "انتهت صلاحية رمز المصادقة");

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    status: error.status || "error",
    message: error.message || "خطأ داخلي في الخادم",
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  next(new ApiError(404, `المسار '${req.originalUrl}' غير موجود`));
};

module.exports = { errorHandler, notFound };