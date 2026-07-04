require("express-async-errors");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { generalLimiter } = require("./middlewares/rateLimiter.middleware");
const routes = require("./routes/index");

const app = express();

// Render runs the app behind a proxy — required for rate-limit and secure cookies
app.set("trust proxy", 1);

// ── Security ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // needed for Swagger UI
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow frontend to load /uploads videos
  })
);
app.use(mongoSanitize());
// origin:true reflects the request origin — works with credentials from any frontend domain
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Rate Limiting ─────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Swagger UI ────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "منصة التعليم العربية — API Docs",
    customCss: ".swagger-ui .topbar { background-color: #1a1a2e; }",
    swaggerOptions: {
      persistAuthorization: true, // يحتفظ بالـ Token بعد الإغلاق
    },
  }),
);

// ── Root ──────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "🎓 منصة التعليم العربية — API",
    version: "1.0.0",
    docs: "/api-docs",
    health: "/health",
    api: "/api/v1",
  });
});

// ── API Routes ────────────────────────────────────────────
app.use("/api/v1", routes);

// ── Health Check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    env: process.env.NODE_ENV,
    version: "1.0.0",
    time: new Date().toISOString(),
  });
});

// ── Error Handlers ────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
