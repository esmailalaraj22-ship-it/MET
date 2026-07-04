const Lesson     = require("./lesson.model");
const Course     = require("../courses/course.model");
const ApiError   = require("../../utils/ApiError");
const path       = require("path");
const fs         = require("fs/promises");
const { verifyCoursePermission } = require("../../utils/coursePermission");
const { notifyCourseStudents }   = require("../../utils/notificationHelper");

const videoDirectory = path.resolve(__dirname, "../../../uploads/videos");

const deleteLocalVideo = async (videoUrl) => {
  if (!videoUrl?.startsWith("/uploads/videos/")) return;
  const filename = path.basename(videoUrl);
  const filePath = path.join(videoDirectory, filename);
  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") console.error("Video cleanup error:", error.message);
  });
};

const createLesson = async (userId, userRole, courseId, data) => {
  await verifyCoursePermission(userId, userRole, courseId);

  if (!data.order) {
    const lastLesson = await Lesson.findOne({ courseId }).sort({ order: -1 }).select("order");
    data.order = lastLesson ? lastLesson.order + 1 : 1;
  }

  const lesson = await Lesson.create({ ...data, courseId, uploadedBy: userId });

  await Course.findByIdAndUpdate(courseId, { $inc: { totalLessons: 1 } });

  await notifyCourseStudents(
    courseId,
    "new_lesson",
    "درس جديد متاح",
    `تم إضافة درس جديد: ${lesson.title}`
  );

  return lesson;
};

const getLessons = async (courseId) =>
  await Lesson.find({ courseId }).sort({ order: 1 });

const getLessonById = async (courseId, lessonId) => {
  const lesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!lesson) throw new ApiError(404, "الدرس غير موجود");
  return lesson;
};

const updateLesson = async (userId, userRole, courseId, lessonId, data) => {
  await verifyCoursePermission(userId, userRole, courseId);
  const oldLesson = await Lesson.findOne({ _id: lessonId, courseId });
  if (!oldLesson) throw new ApiError(404, "الدرس غير موجود");

  const lesson = await Lesson.findOneAndUpdate(
    { _id: lessonId, courseId },
    data,
    { new: true, runValidators: true }
  );
  if (data.videoUrl && data.videoUrl !== oldLesson.videoUrl) {
    await deleteLocalVideo(oldLesson.videoUrl);
  }
  return lesson;
};

const deleteLesson = async (userId, userRole, courseId, lessonId) => {
  await verifyCoursePermission(userId, userRole, courseId);
  const lesson = await Lesson.findOneAndDelete({ _id: lessonId, courseId });
  if (!lesson) throw new ApiError(404, "الدرس غير موجود");
  await deleteLocalVideo(lesson.videoUrl);
  await Course.findByIdAndUpdate(courseId, { $inc: { totalLessons: -1 } });
};

module.exports = { createLesson, getLessons, getLessonById, updateLesson, deleteLesson };
