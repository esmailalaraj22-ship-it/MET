const Exam        = require("./exam.model");
const ExamResult  = require("./examResult.model");
const Student     = require("../students/student.model");
const Enrollment  = require("../enrollments/enrollment.model");
const ApiError    = require("../../utils/ApiError");
const { verifyCoursePermission } = require("../../utils/coursePermission");
const { notifyCourseStudents }   = require("../../utils/notificationHelper");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

// ── CREATE ────────────────────────────────────────────────
const createExam = async (userId, userRole, courseId, data) => {
  await verifyCoursePermission(userId, userRole, courseId);

  if (data.questions) {
    data.questions.forEach((q, i) => {
      if (!q.questionType || q.questionType === "mcq") {
        if (!q.options || q.options.length < 4 || q.options.length > 7) {
          throw new ApiError(400, `السؤال ${i + 1}: الاختيار المتعدد يتطلب بين 4 و 7 خيارات`);
        }
        if (q.correctAnswer === null || q.correctAnswer === undefined) {
          throw new ApiError(400, `السؤال ${i + 1}: يجب تحديد الإجابة الصحيحة`);
        }
      }
    });
  }

  const exam = await Exam.create({ ...data, courseId, createdBy: userId });
  await notifyCourseStudents(courseId, "new_exam", "اختبار جديد", `تم إضافة اختبار: ${exam.title}`);
  return exam;
};

// ── LIST ──────────────────────────────────────────────────
const getExams = async (userId, userRole, courseId) => {
  const filter = { courseId };
  const now    = new Date();

  if (userRole === "student") {
    filter.isPublished = true;
    filter.$or = [{ startTime: null }, { startTime: { $lte: now } }];
  }

  const exams = await Exam.find(filter)
    .select(userRole === "student" ? "-questions.correctAnswer" : "")
    .sort({ createdAt: -1 });

  return exams.map((exam) => {
    const e     = exam.toObject();
    const nowMs = now.getTime();
    if      (e.startTime && nowMs < new Date(e.startTime).getTime()) e.status = "upcoming";
    else if (e.endTime   && nowMs > new Date(e.endTime).getTime())   e.status = "ended";
    else if (e.isPublished)                                           e.status = "active";
    else                                                              e.status = "draft";
    return e;
  });
};

// ── GET ONE ───────────────────────────────────────────────
const getExamById = async (userId, userRole, courseId, examId) => {
  const now  = new Date();
  const exam = await Exam.findOne({ _id: examId, courseId });
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");

  if (userRole === "student") {
    if (!exam.isPublished) throw new ApiError(404, "الاختبار غير متاح");
    if (exam.startTime && now < exam.startTime)
      throw new ApiError(400, `الاختبار سيبدأ في: ${exam.startTime.toISOString()}`);
    if (exam.endTime && now > exam.endTime)
      throw new ApiError(400, "انتهى وقت هذا الاختبار");
    const examObj = exam.toObject();
    examObj.questions = examObj.questions.map(({ correctAnswer, ...rest }) => rest);
    return examObj;
  }
  return exam;
};

// ── SUBMIT (CRITICAL: updates progress) ──────────────────
const submitExam = async (userId, courseId, examId, answers, timeTaken = 0) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const enrollment = await Enrollment.findOne({
    studentId: student._id, courseId, status: "active",
  });
  if (!enrollment) throw new ApiError(403, "أنت غير مسجل في هذا الكورس");

  const now  = new Date();
  const exam = await Exam.findOne({ _id: examId, courseId, isPublished: true });
  if (!exam) throw new ApiError(404, "الاختبار غير موجود أو غير منشور");

  if (exam.startTime && now < exam.startTime) throw new ApiError(400, "لم يبدأ الاختبار بعد");
  if (exam.endTime   && now > exam.endTime)   throw new ApiError(400, "انتهى وقت تقديم هذا الاختبار");

  const existing = await ExamResult.findOne({ examId, studentId: student._id });
  if (existing) throw new ApiError(409, "لقد قدّمت هذا الاختبار مسبقاً");

  let totalPoints  = 0;
  let earnedPoints = 0;
  let hasWritten   = false;

  const gradedAnswers = exam.questions.map((question, idx) => {
    totalPoints += question.points;
    const studentAnswer = answers[idx] || {};

    if (question.questionType === "written") {
      hasWritten = true;
      return {
        questionId:    question._id,
        questionType:  "written",
        writtenAnswer: studentAnswer.writtenAnswer || "",
        isCorrect:     null,
        pointsEarned:  0,
      };
    }

    const correct = studentAnswer.mcqAnswer === question.correctAnswer;
    if (correct) earnedPoints += question.points;
    return {
      questionId:   question._id,
      questionType: "mcq",
      mcqAnswer:    studentAnswer.mcqAnswer ?? null,
      isCorrect:    correct,
      pointsEarned: correct ? question.points : 0,
    };
  });

  const mcqScore      = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const isFullyGraded = !hasWritten;
  const gradeVisible  = exam.showGradesImmediately;

  const result = await ExamResult.create({
    examId,
    studentId:      student._id,
    answers:        gradedAnswers,
    score:          isFullyGraded ? mcqScore : null,
    isPassed:       isFullyGraded ? mcqScore >= exam.passingScore : false,
    timeTaken,
    isFullyGraded,
    gradeVisible,
    submittedAt:    now,
  });

  // ── CRITICAL FIX: update student progress after exam submission ──
  const { recalculateProgress } = require("../progress/progress.service");
  try {
    await recalculateProgress(student._id, courseId);
  } catch (e) {
    console.error("Progress recalc error after exam submit:", e.message);
  }

  return {
    result,
    message:     hasWritten
      ? "تم تقديم الاختبار. الأسئلة المكتوبة قيد المراجعة من المدرس"
      : "تم تقديم الاختبار وتصحيحه تلقائياً",
    score:       isFullyGraded ? mcqScore : null,
    gradeVisible,
  };
};

// ── RESULTS (sorted: highest → lowest → not submitted) ───
const getExamResults = async (userId, userRole, courseId, examId, query) => {
  await verifyCoursePermission(userId, userRole, courseId);

  const submitted = await ExamResult.find({ examId })
    .populate({ path: "studentId", populate: { path: "userId", select: "firstName familyName email profileImage" } })
    .sort({ score: -1, submittedAt: 1 });

  const submittedStudentIds = submitted.map((r) => r.studentId._id.toString());

  const allEnrolled = await Enrollment.find({ courseId, status: "active" })
    .populate({ path: "studentId", populate: { path: "userId", select: "firstName familyName email" } });

  const notSubmitted = allEnrolled
    .filter((e) => !submittedStudentIds.includes(e.studentId._id.toString()))
    .map((e) => ({ student: e.studentId, submitted: false, score: null }));

  return {
    submitted:      submitted.map((r) => ({ ...r.toObject(), submitted: true })),
    notSubmitted,
    total:          submitted.length + notSubmitted.length,
    submittedCount: submitted.length,
  };
};

// ── MY RESULT ─────────────────────────────────────────────
const getMyResult = async (userId, examId) => {
  const student = await Student.findOne({ userId });
  if (!student) throw new ApiError(404, "الطالب غير موجود");

  const result = await ExamResult.findOne({ examId, studentId: student._id });
  if (!result) throw new ApiError(404, "لم تقدّم هذا الاختبار بعد");

  if (!result.gradeVisible) {
    return {
      submitted:    true,
      gradeVisible: false,
      message:      "تم استلام إجاباتك. الدرجات ستظهر بعد مراجعة المدرس",
    };
  }

  const response = result.toObject();
  if (result.isManuallyModified) response.gradeNote = "تم تعديل الدرجة من قبل المدرس";
  return response;
};

// ── GRADE WRITTEN ─────────────────────────────────────────
const gradeWrittenAnswers = async (userId, userRole, resultId, gradesArray) => {
  const result = await ExamResult.findById(resultId).populate("examId");
  if (!result) throw new ApiError(404, "نتيجة الاختبار غير موجودة");

  await verifyCoursePermission(userId, userRole, result.examId.courseId.toString());

  let totalEarned   = 0;
  let totalPossible = 0;

  result.answers = result.answers.map((ans, idx) => {
    const question = result.examId.questions.find(
      (q) => q._id.toString() === ans.questionId.toString()
    );
    if (question) totalPossible += question.points;

    const grade = gradesArray.find((g) => g.questionIndex === idx);
    if (grade && ans.questionType === "written") {
      const maxPts      = question?.points || 0;
      ans.pointsEarned  = Math.min(grade.pointsEarned, maxPts);
      ans.isCorrect     = grade.pointsEarned > 0;
    }
    totalEarned += ans.pointsEarned || 0;
    return ans;
  });

  result.score         = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  result.isPassed      = result.score >= result.examId.passingScore;
  result.isFullyGraded = true;
  result.gradeVisible  = result.examId.showGradesImmediately || !!result.examId.gradesReleasedAt;
  await result.save();
  return result;
};

// ── MODIFY SCORE MANUALLY ─────────────────────────────────
const modifyScore = async (userId, userRole, resultId, newScore) => {
  const result = await ExamResult.findById(resultId).populate("examId");
  if (!result) throw new ApiError(404, "نتيجة الاختبار غير موجودة");

  await verifyCoursePermission(userId, userRole, result.examId.courseId.toString());

  if (newScore < 0 || newScore > 100) throw new ApiError(400, "الدرجة يجب أن تكون بين 0 و 100");

  result.score              = newScore;
  result.isPassed           = newScore >= result.examId.passingScore;
  result.isManuallyModified = true;
  result.manualModifiedBy   = userId;
  result.manualModifiedAt   = new Date();
  result.isFullyGraded      = true;
  await result.save();
  return result;
};

// ── RELEASE GRADES ────────────────────────────────────────
const releaseGrades = async (userId, userRole, examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError(404, "الاختبار غير موجود");
  await verifyCoursePermission(userId, userRole, exam.courseId.toString());

  await Exam.findByIdAndUpdate(examId, {
    showGradesImmediately: true,
    gradesReleasedAt:      new Date(),
  });
  await ExamResult.updateMany({ examId }, { gradeVisible: true });
  return { message: "تم رفع الدرجات وإتاحتها للطلاب" };
};

module.exports = {
  createExam, getExams, getExamById, submitExam,
  getExamResults, getMyResult,
  gradeWrittenAnswers, modifyScore, releaseGrades,
};