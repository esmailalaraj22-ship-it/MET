const express = require("express");
const router  = express.Router();
const ctrl    = require("./progress.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

router.use(protect, authorize("student"));

router.get("/overview",                              ctrl.getOverview);
router.get("/courses/:courseId",                     ctrl.getCourseProgress);
router.patch("/courses/:courseId/lessons/:lessonId", ctrl.markLesson);

module.exports = router;