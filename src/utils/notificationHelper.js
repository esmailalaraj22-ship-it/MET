const Notification = require("../modules/notifications/notification.model");
const Enrollment = require("../modules/enrollments/enrollment.model");

/**
 * Send notification to a single user
 */
const notifyUser = async (userId, type, title, body, relatedId = null, relatedType = null) => {
  try {
    await Notification.create({ userId, type, title, body, relatedId, relatedType });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

/**
 * Send notification to all active students enrolled in a course
 */
const notifyCourseStudents = async (courseId, type, title, body) => {
  try {
    const enrollments = await Enrollment.find({ courseId, status: "active" }).populate({
      path: "studentId",
      select: "userId",
    });

    const notifications = enrollments
      .filter((e) => e.studentId && e.studentId.userId)
      .map((e) => ({
        userId: e.studentId.userId,
        type,
        title,
        body,
        relatedId: courseId,
        relatedType: "Course",
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error("Bulk notification error:", err.message);
  }
};

/**
 * Send notification to all users (broadcast)
 */
const broadcastToAll = async (User, type, title, body) => {
  try {
    const users = await User.find({ isActive: true }).select("_id");
    const notifications = users.map((u) => ({ userId: u._id, type, title, body }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    return notifications.length;
  } catch (err) {
    console.error("Broadcast error:", err.message);
    return 0;
  }
};

module.exports = { notifyUser, notifyCourseStudents, broadcastToAll };