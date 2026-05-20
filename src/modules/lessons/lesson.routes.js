const express = require("express");
const router  = express.Router({ mergeParams: true }); // Access courseId from parent
const ctrl    = require("./lesson.controller");
const { protect }    = require("../../middlewares/auth.middleware");
const { authorize }  = require("../../middlewares/role.middleware");
const validate       = require("../../middlewares/validate.middleware");
const { createLessonSchema, updateLessonSchema } = require("./lesson.validation");

router.use(protect);

router.route("/")
  .get(ctrl.getLessons)
  .post(authorize("admin", "instructor"), validate(createLessonSchema), ctrl.createLesson);

router.route("/:id")
  .get(ctrl.getLessonById)
  .put(authorize("admin", "instructor"), validate(updateLessonSchema), ctrl.updateLesson)
  .delete(authorize("admin", "instructor"), ctrl.deleteLesson);

module.exports = router;