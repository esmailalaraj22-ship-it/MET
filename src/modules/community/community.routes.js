const express = require("express");
const router  = express.Router();
const ctrl    = require("./community.controller");
const { protect }   = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

router.use(protect); // All community routes require login

// ═══════════════════════════════════════════════════════
// GENERAL COMMUNITY  (/api/v1/community/...)
// Open to all authenticated users
// ═══════════════════════════════════════════════════════

router.get("/posts",                                    ctrl.getPosts);
router.post("/posts",                                   ctrl.createPost);
router.delete("/posts/:id",                             ctrl.deletePost);
router.post("/posts/:id/like",                          ctrl.toggleLike);
router.post("/posts/:id/pin", authorize("admin", "instructor"), ctrl.togglePin);

router.get("/posts/:postId/comments",                   ctrl.getComments);
router.post("/posts/:postId/comments",                  ctrl.createComment);
router.delete("/posts/:postId/comments/:commentId",     ctrl.deleteComment);

// ═══════════════════════════════════════════════════════
// COURSE COMMUNITY  (/api/v1/community/courses/:courseId/...)
// Enrolled students + assigned instructor + admin only
// Access is verified inside the service layer
// ═══════════════════════════════════════════════════════

router.get("/courses/:courseId/posts",                              ctrl.getPosts);
router.post("/courses/:courseId/posts",                             ctrl.createPost);
router.delete("/courses/:courseId/posts/:id",                       ctrl.deletePost);
router.post("/courses/:courseId/posts/:id/like",                    ctrl.toggleLike);
router.post("/courses/:courseId/posts/:id/pin",
  authorize("admin", "instructor"),                                  ctrl.togglePin);

router.get("/courses/:courseId/posts/:postId/comments",             ctrl.getComments);
router.post("/courses/:courseId/posts/:postId/comments",            ctrl.createComment);
// FIX BUG-6: Added missing delete comment for course community
router.delete("/courses/:courseId/posts/:postId/comments/:commentId", ctrl.deleteComment);

module.exports = router;