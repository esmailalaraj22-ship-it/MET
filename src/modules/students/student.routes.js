const express = require("express");
const router  = express.Router();
const ctrl    = require("./student.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const validate      = require("../../middlewares/validate.middleware");
const { updateProfileSchema } = require("./student.validation");

router.use(protect, authorize("student"));

router.get("/profile",                        ctrl.getProfile);
router.put("/profile",                        validate(updateProfileSchema), ctrl.updateProfile);
router.get("/dashboard",                      ctrl.getDashboard);
router.get("/courses/available",              ctrl.getAvailableCourses);
router.get("/chat/instructors",               ctrl.getChatInstructors);
router.get("/met/history",                    ctrl.getMetHistory);
router.post("/courses/:courseId/enroll",      ctrl.enrollInCourse);
router.delete("/courses/:courseId/drop",      ctrl.dropCourse);
router.get("/courses/:courseId/content",      ctrl.getCourseContent);

module.exports = router;
