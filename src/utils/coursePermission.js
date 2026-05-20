/**
 * Shared utility: verify a user has permission to manage a course.
 *
 * Rules:
 *   admin      → always allowed
 *   instructor → only if course is in their assignedCourses array
 *   others     → always denied
 *
 * Previously this function was copy-pasted into lesson.service, assignment.service,
 * exam.service, and community.service. Centralising it here removes duplication
 * and ensures permission logic is changed in one place only.
 */
const Course     = require("../modules/courses/course.model");
const Instructor = require("../modules/instructors/instructor.model");
const ApiError   = require("./ApiError");

const verifyCoursePermission = async (userId, userRole, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "الكورس غير موجود");

  if (userRole === "admin") return course;

  if (userRole === "instructor") {
    const instructor = await Instructor.findOne({ userId });
    if (!instructor) throw new ApiError(403, "ملف المدرس غير موجود");

    const isAssigned = instructor.assignedCourses.some(
      (id) => id.toString() === courseId.toString()
    );
    if (!isAssigned) throw new ApiError(403, "هذا الكورس غير مسند إليك");
    return course;
  }

  throw new ApiError(403, "لا تملك صلاحية إدارة محتوى هذا الكورس");
};

module.exports = { verifyCoursePermission };