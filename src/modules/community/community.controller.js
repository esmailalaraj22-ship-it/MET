const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./community.service");

// ── POSTS ─────────────────────────────────────────────────

// @route POST /community/posts                         (general)
// @route POST /community/courses/:courseId/posts       (course)
const createPost = asyncHandler(async (req, res) => {
  const { content, attachments } = req.body;
  const courseId = req.params.courseId || null;
  const post = await service.createPost(
    req.user._id,
    req.user.role,
    content,
    courseId,
    attachments
  );
  return ApiResponse.success(res, 201, "تم نشر المنشور بنجاح", { post });
});

// @route GET /community/posts                          (general)
// @route GET /community/courses/:courseId/posts        (course)
const getPosts = asyncHandler(async (req, res) => {
  const courseId = req.params.courseId || null;
  const { posts, pagination } = await service.getPosts(
    req.user._id,
    req.user.role,
    courseId,
    req.query
  );
  return ApiResponse.paginated(res, "المنشورات", posts, pagination);
});

// @route DELETE /community/posts/:id
// @route DELETE /community/courses/:courseId/posts/:id
const deletePost = asyncHandler(async (req, res) => {
  const courseId = req.params.courseId || null;
  await service.deletePost(req.params.id, req.user._id, req.user.role, courseId);
  return ApiResponse.success(res, 200, "تم حذف المنشور بنجاح");
});

// @route POST /community/posts/:id/like
// @route POST /community/courses/:courseId/posts/:id/like
const toggleLike = asyncHandler(async (req, res) => {
  const result = await service.toggleLike(req.params.id, req.user._id, req.user.role);
  return ApiResponse.success(
    res, 200,
    result.liked ? "تم الإعجاب بالمنشور" : "تم إلغاء الإعجاب",
    result
  );
});

// @route POST /community/posts/:id/pin      (admin/instructor only)
const togglePin = asyncHandler(async (req, res) => {
  const result = await service.togglePin(req.params.id, req.user._id, req.user.role);
  return ApiResponse.success(
    res, 200,
    result.isPinned ? "تم تثبيت المنشور" : "تم إلغاء تثبيت المنشور",
    result
  );
});

// ── COMMENTS ──────────────────────────────────────────────

// @route POST /community/posts/:postId/comments
const createComment = asyncHandler(async (req, res) => {
  const comment = await service.createComment(
    req.params.postId,
    req.user._id,
    req.user.role,
    req.body.content
  );
  return ApiResponse.success(res, 201, "تم إضافة التعليق بنجاح", { comment });
});

// @route GET /community/posts/:postId/comments
const getComments = asyncHandler(async (req, res) => {
  const { comments, pagination } = await service.getComments(
    req.params.postId,
    req.user._id,
    req.user.role,
    req.query
  );
  return ApiResponse.paginated(res, "التعليقات", comments, pagination);
});

// @route DELETE /community/posts/:postId/comments/:commentId
const deleteComment = asyncHandler(async (req, res) => {
  await service.deleteComment(req.params.commentId, req.user._id, req.user.role);
  return ApiResponse.success(res, 200, "تم حذف التعليق بنجاح");
});

module.exports = {
  createPost,
  getPosts,
  deletePost,
  toggleLike,
  togglePin,
  createComment,
  getComments,
  deleteComment,
};