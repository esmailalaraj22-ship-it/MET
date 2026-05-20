const { verifyToken } = require("../utils/generateToken");
const User = require("../modules/users/user.model");
const { sendMessage } = require("../modules/chat/chat.service");

/**
 * Socket.IO setup for real-time chat
 * This is designed to run alongside the REST API
 *
 * Authentication: JWT token passed in socket handshake auth
 * Usage: io.connect(url, { auth: { token: 'Bearer ...' } })
 */
const initializeSocket = (io) => {
  // Middleware: authenticate socket connection via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token?.replace("Bearer ", "");
      if (!token) return next(new Error("Authentication required"));

      const decoded = verifyToken(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error("User not found or inactive"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user.email} [${socket.user.role}]`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.user._id}`);

    // Join a conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Send message via socket
    socket.on("send_message", async ({ conversationId, content, type = "text" }) => {
      try {
        const message = await sendMessage(conversationId, socket.user._id, content, type);
        // Broadcast to all in conversation room
        io.to(`conv:${conversationId}`).emit("new_message", {
          conversationId,
          message: {
            ...message.toObject(),
            sender: {
              id:           socket.user._id,
              firstName:    socket.user.firstName,
              familyName:   socket.user.familyName,
              profileImage: socket.user.profileImage,
            },
          },
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit("user_typing", {
        userId: socket.user._id,
        name:   socket.user.firstName,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.email}`);
    });
  });
};

module.exports = initializeSocket;