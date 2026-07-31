const express = require("express");
const router  = express.Router();
const ctrl    = require("./instructor.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { updateProfileSchema } = require("./instructor.validation");

router.use(protect, authorize("instructor"));

router.get("/profile",                          ctrl.getProfile);
router.put("/profile",                          validate(updateProfileSchema), ctrl.updateProfile);
router.get("/dashboard",                        ctrl.getDashboard);
router.get("/finance",                          ctrl.getFinance);
router.get("/courses/:courseId/students",       ctrl.getCourseStudents);

module.exports = router;
