const express = require("express");
const router  = express.Router({ mergeParams: true }); // Access :courseId from parent
const ctrl    = require("./assignment.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

router.use(protect);

router.route("/")
  .get(ctrl.getAssignments)
  .post(authorize("admin", "instructor"), ctrl.createAssignment);

router.post("/:id/submit",                              authorize("student"), ctrl.submitAssignment);
router.get("/:id/submissions",                          authorize("admin", "instructor"), ctrl.getSubmissions);
router.patch("/:id/submissions/:submissionId/grade",    authorize("admin", "instructor"), ctrl.gradeSubmission);

module.exports = router;