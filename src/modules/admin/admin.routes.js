const express = require("express");
const router  = express.Router();
const ctrl    = require("./admin.controller");
const { protect }    = require("../../middlewares/auth.middleware");
const { authorize }  = require("../../middlewares/role.middleware");
const validate       = require("../../middlewares/validate.middleware");
const {
  updateProfileSchema, createInstructorSchema, createCourseSchema,
  createUniversitySchema, applyDiscountSchema, assignInstructorSchema,
  addMetSchema, releasePaymentSchema,
} = require("./admin.validation");

router.use(protect, authorize("admin"));

// Profile & Stats
router.get("/profile",    ctrl.getProfile);
router.put("/profile",    validate(updateProfileSchema), ctrl.updateProfile);
router.get("/stats",      ctrl.getStats);

// Universities
router.route("/universities")
  .post(validate(createUniversitySchema), ctrl.createUniversity)
  .get(ctrl.getUniversities);
router.patch("/universities/:id/toggle", ctrl.toggleUniversity);
router.delete("/universities/:id",       ctrl.deleteUniversity);

// Instructors
router.route("/instructors")
  .post(validate(createInstructorSchema), ctrl.createInstructor)
  .get(ctrl.getInstructors);
router.get("/instructors/:id",           ctrl.getInstructorById);
router.patch("/instructors/:id/toggle",  ctrl.toggleInstructor);

// Students
router.get("/students",                  ctrl.getStudents);
router.patch("/students/:id/toggle",     ctrl.toggleStudent);
router.patch("/students/:id/discount",   validate(applyDiscountSchema), ctrl.applyDiscount);
router.patch("/students/:id/met",        validate(addMetSchema), ctrl.addMet);

// Courses
router.route("/courses")
  .post(validate(createCourseSchema), ctrl.createCourse)
  .get(ctrl.getCourses);
router.get("/courses/:id",                               ctrl.getCourseDetails);
router.patch("/courses/:id/assign-instructor",           validate(assignInstructorSchema), ctrl.assignInstructor);
router.delete("/courses/:id",                            ctrl.deleteCourse);
router.get("/courses/:id/students",                      ctrl.getCourseStudents);
router.delete("/courses/:courseId/students/:studentId",  ctrl.removeStudentFromCourse);
router.delete("/courses/:id/students",                   ctrl.removeAllStudents);

// Finance
router.get("/finance/payments",                              ctrl.getPayments);
router.post("/finance/instructors/:instructorId/release",    validate(releasePaymentSchema), ctrl.releasePayment);
router.post("/finance/instructors/:instructorId/cancel",     validate(releasePaymentSchema), ctrl.cancelPayment);

// Notifications
router.post("/notifications/broadcast", ctrl.broadcastNotification);

module.exports = router;