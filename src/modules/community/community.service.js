const Post       = require("./post.model");
const Comment    = require("./comment.model");
const Enrollment = require("../enrollments/enrollment.model");
const Student    = require("../students/student.model");
const Course     = require("../courses/course.model");
const ApiError   = require("../../utils/ApiError");
const { verifyCoursePermission } = require("../../utils/coursePermission");
const { notifyUser }             = require("../../utils/notificationHelper");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

/**
 * Verify a user can interact with a course community.
 *
 * Admin: always allowed.
 * Instructor: only if assigned to the course (reuses verifyCoursePermission).
 * Student: only if actively enrolled.
 */
const verifyCourseAccess = async (userId, userRole, courseId) => {
  if (userRole === "admin") return true;

  if (userRole === "instructor") {
    try {
      await verifyCoursePermission(userId, userRole, courseId);
      return true;
    } catch {
      return false;
    }
  }

  if (userRole === "student") {
    const student = await Student.findOne({ userId });
    if (!student) return false;
    const enrollment = await Enrollment.findOne({
      studentId: student._id, courseId, status: "active",
    });
    return !!enrollment;
  }

  return false;
};

// ── POSTS ─────────────────────────────────────────────────

const createPost = async (userId, userRole, content, courseId = null, attachments = []) => {
  if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "الكورس غير موجود");

    const hasAccess = await verifyCourseAccess(userId, userRole, courseId);
    if (!hasAccess) throw new ApiError(403, "يجب التسجيل في الكورس للمشاركة في مجتمعه");
  }

  return await Post.create({ authorId: userId, courseId, content, attachments });
};

const getPosts = async (userId, userRole, courseId, query) => {
  if (courseId) {
    const hasAccess = await verifyCourseAccess(userId, userRole, courseId);
    if (!hasAccess) throw new ApiError(403, "يجب التسجيل في الكورس للاطلاع على مجتمعه");
  }

  const { page, limit, skip } = getPagination(query);
  const filter = { isDeleted: false, courseId: courseId || null };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("authorId", "firstName familyName profileImage role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip).limit(limit),
    Post.countDocuments(filter),
  ]);

  return { posts, pagination: getPaginationMeta(total, page, limit) };
};

const deletePost = async (postId, userId, userRole, courseId = null) => {
  const query = { _id: postId };
  if (courseId) query.courseId = courseId;

  const post = await Post.findOne(query);
  if (!post) throw new ApiError(404, "المنشور غير موجود");

  const isOwner = post.authorId.toString() === userId.toString();

  // Instructor cannot delete admin posts
  if (userRole === "instructor" && !isOwner) {
    // Find post author's role
    const User = require("../users/user.model");
    const author = await User.findById(post.authorId).select("role");
    if (author && author.role === "admin") {
      throw new ApiError(403, "المدرس لا يستطيع حذف منشورات الأدمن");
    }
  }

  const isMod = ["admin", "instructor"].includes(userRole);
  if (!isOwner && !isMod) throw new ApiError(403, "لا تملك صلاحية حذف هذا المنشور");

  post.isDeleted = true;
  await post.save();
};

const toggleLike = async (postId, userId, userRole) => {
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new ApiError(404, "المنشور غير موجود");

  if (post.courseId) {
    const hasAccess = await verifyCourseAccess(userId, userRole, post.courseId);
    if (!hasAccess) throw new ApiError(403, "يجب التسجيل في الكورس للتفاعل مع منشوراته");
  }

  const idx = post.likes.findIndex((id) => id.toString() === userId.toString());
  if (idx === -1) post.likes.push(userId);
  else            post.likes.splice(idx, 1);

  await post.save();
  return { liked: idx === -1, totalLikes: post.likes.length };
};

const togglePin = async (postId, userId, userRole) => {
  if (!["admin", "instructor"].includes(userRole)) {
    throw new ApiError(403, "فقط الأدمن والمدرس يمكنهم تثبيت المنشورات");
  }
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new ApiError(404, "المنشور غير موجود");

  post.isPinned = !post.isPinned;
  await post.save();
  return { isPinned: post.isPinned };
};

// ── COMMENTS ──────────────────────────────────────────────

const createComment = async (postId, userId, userRole, content) => {
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new ApiError(404, "المنشور غير موجود");

  if (post.courseId) {
    const hasAccess = await verifyCourseAccess(userId, userRole, post.courseId);
    if (!hasAccess) throw new ApiError(403, "يجب التسجيل في الكورس للتعليق");
  }

  const comment = await Comment.create({ postId, authorId: userId, content });

  if (post.authorId.toString() !== userId.toString()) {
    await notifyUser(
      post.authorId,
      "post_reply",
      "تعليق جديد على منشورك",
      "قام شخص بالتعليق على منشورك",
      post._id,
      "Post"
    );
  }

  return comment;
};

const getComments = async (postId, userId, userRole, query) => {
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) throw new ApiError(404, "المنشور غير موجود");

  if (post.courseId) {
    const hasAccess = await verifyCourseAccess(userId, userRole, post.courseId);
    if (!hasAccess) throw new ApiError(403, "يجب التسجيل في الكورس لمشاهدة التعليقات");
  }

  const { page, limit, skip } = getPagination(query);
  const [comments, total] = await Promise.all([
    Comment.find({ postId, isDeleted: false })
      .populate("authorId", "firstName familyName profileImage role")
      .sort({ createdAt: 1 })
      .skip(skip).limit(limit),
    Comment.countDocuments({ postId, isDeleted: false }),
  ]);

  return { comments, pagination: getPaginationMeta(total, page, limit) };
};

const deleteComment = async (commentId, userId, userRole) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "التعليق غير موجود");

  const isOwner = comment.authorId.toString() === userId.toString();
  const isMod   = ["admin", "instructor"].includes(userRole);

  if (!isOwner && !isMod) throw new ApiError(403, "لا تملك صلاحية حذف هذا التعليق");

  comment.isDeleted = true;
  await comment.save();
};

module.exports = {
  createPost, getPosts, deletePost, toggleLike, togglePin,
  createComment, getComments, deleteComment,
};