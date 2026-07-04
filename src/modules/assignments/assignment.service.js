const Assignment  = require("./assignment.model");
const Submission  = require("./submission.model");
const Student     = require("../students/student.model");
const Enrollment  = require("../enrollments/enrollment.model");
const ApiError    = require("../../utils/ApiError");
const { verifyCoursePermission } = require("../../utils/coursePermission");
const { notifyCourseStudents }   = require("../../utils/notificationHelper");

// ── CREATE ────────────────────────────────────────────────
const createAssignment = async (userId, userRole, courseId, data) => {
  await verifyCoursePermission(userId, userRole, courseId);
  const assignment = await Assignment.create({ ...data, courseId, createdBy: userId });
  await notifyCourseStudents(courseId, "new_assignment", "واجب جديد", `تم إضافة واجب: ${assignment.title}`);
  return assignment;
};

const getAssignments = async (courseId) =>
  await Assignment.find({ courseId }).sort({ createdAt: -1 });

// ── SUBMIT (CRITICAL: updates progress) ──────────────────
const submitAssignment = async (userId, assignmentId, data) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, "الواجب غير موجود");

  const enrollment = await Enrollment.findOne({
    studentId: student._id,
    courseId:  assignment.courseId,
    status:    { $in: ["active", "completed"] },
  });
  if (!enrollment) throw new ApiError(403, "أنت غير مسجل في هذا الكورس");

  const existing = await Submission.findOne({ assignmentId, studentId: student._id });
  if (existing) throw new ApiError(409, "لقد سلّمت هذا الواجب مسبقاً");

  const { submissionType, fileUrl, textAnswer } = data;
  if (assignment.submissionType !== "any" && submissionType !== assignment.submissionType) {
    throw new ApiError(400, `نوع التسليم المطلوب هو: ${assignment.submissionType}`);
  }

  const isLate = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  const submission = await Submission.create({
    assignmentId,
    studentId:      student._id,
    submissionType: submissionType || "text",
    fileUrl:        fileUrl        || null,
    textAnswer:     textAnswer     || "",
    isLate,
    submittedAt:    new Date(),
  });

  // ── CRITICAL FIX: update student progress after submission ──
  const { recalculateProgress } = require("../progress/progress.service");
  try {
    await recalculateProgress(student._id, assignment.courseId);
  } catch (e) {
    // Non-blocking — submission still succeeds even if progress recalc fails
    console.error("Progress recalc error after assignment submit:", e.message);
  }

  return submission;
};

// ── SUBMISSIONS (ordered: early → late → not submitted) ──
const getSubmissions = async (userId, userRole, assignmentId) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, "الواجب غير موجود");

  await verifyCoursePermission(userId, userRole, assignment.courseId.toString());

  const submitted = await Submission.find({ assignmentId })
    .populate({ path: "studentId", populate: { path: "userId", select: "firstName familyName email profileImage" } })
    .sort({ submittedAt: 1 });

  const submittedStudentIds = submitted.map((s) => s.studentId._id.toString());
  const allEnrolled = await Enrollment.find({
    courseId: assignment.courseId,
    status: { $in: ["active", "completed"] },
  })
    .populate({ path: "studentId", populate: { path: "userId", select: "firstName familyName email" } });

  const notSubmitted = allEnrolled
    .filter((e) => !submittedStudentIds.includes(e.studentId._id.toString()))
    .map((e) => ({ student: e.studentId, submitted: false, isLate: false, score: null }));

  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const early   = dueDate ? submitted.filter((s) => !s.isLate) : submitted;
  const late    = dueDate ? submitted.filter((s) => s.isLate)  : [];

  return {
    assignment,
    early:        early.map((s) => ({ ...s.toObject(), submitted: true })),
    late:         late.map((s)  => ({ ...s.toObject(), submitted: true })),
    notSubmitted,
    summary: {
      total:             allEnrolled.length,
      earlyCount:        early.length,
      lateCount:         late.length,
      notSubmittedCount: notSubmitted.length,
    },
  };
};

// ── GRADE ─────────────────────────────────────────────────
const gradeSubmission = async (userId, userRole, submissionId, score, feedback) => {
  const submission = await Submission.findById(submissionId).populate("assignmentId");
  if (!submission) throw new ApiError(404, "التسليم غير موجود");

  await verifyCoursePermission(userId, userRole, submission.assignmentId.courseId.toString());

  if (score < 0 || score > submission.assignmentId.maxScore) {
    throw new ApiError(400, `الدرجة يجب أن تكون بين 0 و ${submission.assignmentId.maxScore}`);
  }

  submission.score    = score;
  submission.feedback = feedback || "";
  submission.gradedBy = userId;
  submission.gradedAt = new Date();
  await submission.save();
  return submission;
};

module.exports = {
  createAssignment, getAssignments, submitAssignment, getSubmissions, gradeSubmission,
};
