const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse  = require("../../utils/ApiResponse");
const service      = require("./chat.service");

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await service.getMyConversations(req.user._id);
  return ApiResponse.success(res, 200, "محادثاتك", { conversations });
});

const startConversation = asyncHandler(async (req, res) => {
  const { targetUserId, courseId } = req.body;
  const conversation = await service.getOrCreateConversation(req.user._id, targetUserId, courseId);
  return ApiResponse.success(res, 200, "المحادثة", { conversation });
});

const getMessages = asyncHandler(async (req, res) => {
  const { messages, pagination } = await service.getMessages(req.params.id, req.user._id, req.query);
  return ApiResponse.paginated(res, "الرسائل", messages, pagination);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, type, fileUrl } = req.body;
  const message = await service.sendMessage(req.params.id, req.user._id, content, type, fileUrl);
  return ApiResponse.success(res, 201, "تم إرسال الرسالة", { message });
});

module.exports = { getConversations, startConversation, getMessages, sendMessage };