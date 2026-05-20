const Lesson     = require("./lesson.model");
const Course     = require("../courses/course.model");
const ApiError   = require("../../utils/ApiError");
const { verifyCoursePermission } = require("../../utils/coursePermission");
const { notifyCourseStudents }   = require("../../utils/notificationHelper");

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
  const lesson = await Lesson.findOneAndUpdate(
    { _id: lessonId, courseId },
    data,
    { new: true, runValidators: true }
  );
  if (!lesson) throw new ApiError(404, "الدرس غير موجود");
  return lesson;
};

const deleteLesson = async (userId, userRole, courseId, lessonId) => {
  await verifyCoursePermission(userId, userRole, courseId);
  const lesson = await Lesson.findOneAndDelete({ _id: lessonId, courseId });
  if (!lesson) throw new ApiError(404, "الدرس غير موجود");
  await Course.findByIdAndUpdate(courseId, { $inc: { totalLessons: -1 } });
};

module.exports = { createLesson, getLessons, getLessonById, updateLesson, deleteLesson };