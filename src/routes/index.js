const express = require("express");
const router  = express.Router();

// ── Public ────────────────────────────────────────────────
router.use("/auth",         require("../modules/auth/auth.routes"));
router.use("/universities", require("../modules/universities/university.routes"));

// ── Admin ─────────────────────────────────────────────────
router.use("/admin",        require("../modules/admin/admin.routes"));

// ── Instructor ────────────────────────────────────────────
router.use("/instructor",   require("../modules/instructors/instructor.routes"));

// ── Student ───────────────────────────────────────────────
router.use("/student",      require("../modules/students/student.routes"));

// ── Progress ──────────────────────────────────────────────
router.use("/progress",     require("../modules/progress/progress.routes"));

// ── Course Content (nested routes) ────────────────────────
router.use("/courses/:courseId/lessons",     require("../modules/lessons/lesson.routes"));
router.use("/courses/:courseId/assignments", require("../modules/assignments/assignment.routes"));
router.use("/courses/:courseId/exams",       require("../modules/exams/exam.routes"));

// ── Community ─────────────────────────────────────────────
router.use("/community",    require("../modules/community/community.routes"));

// ── Chat ──────────────────────────────────────────────────
router.use("/chat",         require("../modules/chat/chat.routes"));

// ── Notifications ─────────────────────────────────────────
router.use("/notifications", require("../modules/notifications/notification.routes"));

module.exports = router;