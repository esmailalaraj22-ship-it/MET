const express = require("express");
const router  = express.Router();
const ctrl    = require("./auth.controller");
const { protect }    = require("../../middlewares/auth.middleware");
const validate       = require("../../middlewares/validate.middleware");
const { loginLimiter } = require("../../middlewares/rateLimiter.middleware");
const { registerStudentSchema, loginSchema, changePasswordSchema } = require("./auth.validation");

router.post("/register",        validate(registerStudentSchema), ctrl.register);
router.post("/login",           loginLimiter, validate(loginSchema), ctrl.login);
router.post("/refresh-token",   ctrl.refreshToken);
router.post("/logout",          protect, ctrl.logout);
router.post("/change-password", protect, validate(changePasswordSchema), ctrl.changePasswordCtrl);
router.get("/me",               protect, ctrl.getMe);

module.exports = router;