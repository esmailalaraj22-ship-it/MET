const express = require("express");
const router  = express.Router({ mergeParams: true });
const ctrl    = require("./exam.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

router.use(protect);

router.route("/")
  .get(ctrl.getExams)
  .post(authorize("admin", "instructor"), ctrl.createExam);

router.get("/:id",                                ctrl.getExamById);
router.post("/:id/submit",                        authorize("student"), ctrl.submitExam);
router.get("/:id/results",                        authorize("admin", "instructor"), ctrl.getResults);
router.get("/:id/my-result",                      authorize("student"), ctrl.getMyResult);
router.post("/:id/release-grades",                authorize("admin", "instructor"), ctrl.releaseGrades);
router.patch("/results/:resultId/grade-written",  authorize("admin", "instructor"), ctrl.gradeWrittenAnswers);
router.patch("/results/:resultId/modify-score",   authorize("admin", "instructor"), ctrl.modifyScore);

module.exports = router;