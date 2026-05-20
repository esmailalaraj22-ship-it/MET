const asyncHandler    = require("../../utils/asyncHandler");
const ApiResponse     = require("../../utils/ApiResponse");
const Notification    = require("./notification.model");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

// @desc  Get my notifications
// @route GET /api/v1/notifications
const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { userId: req.user._id };
  if (req.query.unread === "true") filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return ApiResponse.paginated(res, "إشعاراتك", notifications, {
    ...getPaginationMeta(total, page, limit),
    unreadCount,
  });
});

// @desc  Mark notification as read
// @route PATCH /api/v1/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ status: "fail", message: "الإشعار غير موجود" });
  return ApiResponse.success(res, 200, "تم تحديد الإشعار كمقروء", { notification: notif });
});

// @desc  Mark all as read
// @route PATCH /api/v1/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  return ApiResponse.success(res, 200, "تم تحديد جميع الإشعارات كمقروءة");
});

// @desc  Delete notification
// @route DELETE /api/v1/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  return ApiResponse.success(res, 200, "تم حذف الإشعار");
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };