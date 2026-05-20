const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: "fail",
    message: "محاولات تسجيل دخول كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: {
    status: "fail",
    message: "عدد كبير من الطلبات. حاول مرة أخرى لاحقاً",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, generalLimiter };