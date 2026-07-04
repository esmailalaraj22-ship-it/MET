const Progress   = require("./progress.model");
const Enrollment = require("../enrollments/enrollment.model");
const Student    = require("../students/student.model");
const Lesson     = require("../lessons/lesson.model");
const Assignment = require("../assignments/assignment.model");
const Exam       = require("../exams/exam.model");
const Submission = require("../assignments/submission.model");
const ExamResult = require("../exams/examResult.model");
const ApiError   = require("../../utils/ApiError");

/**
 * Recalculate progress percentage.
 * Called by: lesson completion, assignment submission, exam submission.
 * Formula: (completedLessons + completedAssignments + completedExams) / total * 100
 */
const recalculateProgress = async (studentId, courseId) => {
  let progress = await Progress.findOne({ studentId, courseId });
  if (!progress) {
    progress = await Progress.create({ studentId, courseId, percentage: 0 });
  }

  const [totalLessons, totalAssignments, totalExams] = await Promise.all([
    Lesson.countDocuments({ courseId, isPublished: true }),
    Assignment.countDocuments({ courseId }),
    Exam.countDocuments({ courseId, isPublished: true }),
  ]);

  const totalItems = totalLessons + totalAssignments + totalExams;
  if (totalItems === 0) {
    progress.percentage = 0;
    await progress.save();
    return progress;
  }

  // Count completed assignments (any submission counts as completed)
  const completedAssignmentCount = await Submission.countDocuments({
    studentId,
    assignmentId: {
      $in: (await Assignment.find({ courseId }).select("_id")).map((a) => a._id),
    },
  });

  // Count completed exams (any submission counts)
  const completedExamCount = await ExamResult.countDocuments({
    studentId,
    examId: {
      $in: (await Exam.find({ courseId, isPublished: true }).select("_id")).map((e) => e._id),
    },
  });

  const completedItems =
    progress.completedLessons.length +
    completedAssignmentCount +
    completedExamCount;

  progress.percentage     = Math.min(100, Math.round((completedItems / totalItems) * 100));
  progress.lastAccessedAt = new Date();
  await progress.save();

  // Auto-complete enrollment when 100%
  if (progress.percentage === 100) {
    await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      { status: "completed", completedAt: new Date() }
    );
  }

  return progress;
};

// ── Mark lesson as watched ────────────────────────────────
const markLessonCompleted = async (userId, courseId, lessonId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId,
    status: { $in: ["active", "completed"] },
  });
  if (!enrollment) throw new ApiError(403, "أنت غير مسجل في هذا الكورس");

  const lesson = await Lesson.findOne({ _id: lessonId, courseId, isPublished: true });
  if (!lesson) throw new ApiError(404, "الدرس غير موجود");

  let progress = await Progress.findOne({ studentId: student._id, courseId });
  if (!progress) {
    progress = await Progress.create({ studentId: student._id, courseId });
  }

  const alreadyDone = progress.completedLessons.some((id) => id.toString() === lessonId.toString());
  if (!alreadyDone) {
    progress.completedLessons.push(lessonId);
    await progress.save();
  }

  return await recalculateProgress(student._id, courseId);
};

// ── Course progress ───────────────────────────────────────
const getCourseProgress = async (userId, courseId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const progress = await Progress.findOne({ studentId: student._id, courseId })
    .populate("completedLessons", "title order duration");

  return progress || { percentage: 0, completedLessons: [] };
};

// ── Overview all courses ──────────────────────────────────
const getProgressOverview = async (userId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  return await Progress.find({ studentId: student._id })
    .populate("courseId", "title thumbnail category level totalLessons")
    .sort({ lastAccessedAt: -1 });
};

module.exports = {
  recalculateProgress,
  markLessonCompleted,
  getCourseProgress,
  getProgressOverview,
};
