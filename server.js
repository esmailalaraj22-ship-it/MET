require("dotenv").config();
const http     = require("http");
const { Server } = require("socket.io");
const app      = require("./src/app");
const connectDB        = require("./src/config/db");
const initializeSocket = require("./src/socket/socket");

const PORT = parseInt(process.env.PORT || "5000", 10);

const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Wrap Express in HTTP server (needed for Socket.IO)
  const server = http.createServer(app);

  // 3. Attach Socket.IO
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
    // Increase ping timeout for slower mobile connections
    pingTimeout: 60000,
  });

  initializeSocket(io);

  // 4. Start listening
  server.listen(PORT, () => {
    console.log("─────────────────────────────────────────");
    console.log(`  🚀 Server running on port ${PORT}`);
    console.log(`  📦 Mode:   ${process.env.NODE_ENV || "development"}`);
    console.log(`  ❤️  Health: http://localhost:${PORT}/health`);
    console.log(`  🔗 API:    http://localhost:${PORT}/api/v1`);
    console.log("─────────────────────────────────────────");
  });

  // 5. Graceful shutdown handlers
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err.message);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err.message);
    process.exit(1);
  });
};

startServer();