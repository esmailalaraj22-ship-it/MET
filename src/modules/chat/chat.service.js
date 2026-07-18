const Conversation = require("./conversation.model");
const Message      = require("./message.model");
const Student      = require("../students/student.model");
const Enrollment   = require("../enrollments/enrollment.model");
const Course       = require("../courses/course.model");
const User         = require("../users/user.model");
const Notification = require("../notifications/notification.model");
const ApiError     = require("../../utils/ApiError");
const { getPagination, getPaginationMeta } = require("../../utils/pagination");

/**
 * Get or create a conversation between two users
 * A student can only chat with instructors of their enrolled courses
 */
const getOrCreateConversation = async (initiatorId, targetUserId, courseId = null) => {
  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    participants: { $all: [initiatorId, targetUserId] },
    ...(courseId ? { courseId } : {}),
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [initiatorId, targetUserId],
      courseId:     courseId || null,
    });
  }

  return conversation;
};

/**
 * Get all conversations for a user (sidebar list)
 */
const getMyConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .populate({
      path: "participants",
      select: "firstName secondName familyName email profileImage role",
    })
    .populate("lastMessage", "content type createdAt isRead senderId")
    .populate("courseId",    "title thumbnail")
    .sort({ lastMessageAt: -1 });

  // Format: each conversation shows the "other" participant
  return conversations.map((conv) => ({
    id:           conv._id,
    course:       conv.courseId,
    lastMessage:  conv.lastMessage,
    updatedAt:    conv.lastMessageAt || conv.updatedAt,
    otherUser:    conv.participants.find((p) => p._id.toString() !== userId.toString()),
  }));
};

/**
 * Get messages in a conversation (with pagination)
 */
const getMessages = async (conversationId, userId, query) => {
  const { page, limit, skip } = getPagination(query);

  // Verify user is participant
  const conversation = await Conversation.findOne({
    _id:          conversationId,
    participants: userId,
  });
  if (!conversation) throw new ApiError(403, "لا تملك صلاحية الوصول لهذه المحادثة");

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .populate("senderId", "firstName familyName profileImage role")
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    Message.countDocuments({ conversationId }),
  ]);

  // Mark messages as read
  await Message.updateMany(
    { conversationId, senderId: { $ne: userId }, isRead: false },
    { isRead: true }
  );

  return { messages: messages.reverse(), pagination: getPaginationMeta(total, page, limit) };
};

/**
 * Send a message (HTTP — also used as Socket.IO fallback)
 */
const sendMessage = async (conversationId, senderId, content, type = "text", fileUrl = null) => {
  const conversation = await Conversation.findOne({
    _id:          conversationId,
    participants: senderId,
  });
  if (!conversation) throw new ApiError(403, "لا تملك صلاحية الوصول لهذه المحادثة");

  const message = await Message.create({ conversationId, senderId, content, type, fileUrl });

  // Update conversation's last message
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage:   message._id,
    lastMessageAt: new Date(),
  });

  // Unread-message notification carrying the sender's name.
  // One UNREAD notification per conversation (updated with the latest
  // message) so the bell never floods with duplicates from one chat.
  try {
    const sender = await User.findById(senderId).select("firstName familyName");
    const senderName = sender ? `${sender.firstName} ${sender.familyName}` : "مستخدم";
    const preview = type === "text" ? String(content || "").slice(0, 60) : "📎 مرفق جديد";
    const recipients = conversation.participants.filter(
      (p) => p.toString() !== senderId.toString()
    );
    await Promise.all(
      recipients.map((recipientId) =>
        Notification.findOneAndUpdate(
          { userId: recipientId, type: "message", relatedId: conversation._id, isRead: false },
          {
            title: `رسالة جديدة من ${senderName}`,
            body: preview,
            relatedType: "Conversation",
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );
  } catch (err) {
    console.error("Chat notification error:", err.message);
  }

  return message;
};

module.exports = { getOrCreateConversation, getMyConversations, getMessages, sendMessage };