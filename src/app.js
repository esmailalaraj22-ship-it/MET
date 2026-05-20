require("express-async-errors");
const express       = require("express");
const helmet        = require("helmet");
const cors          = require("cors");
const morgan        = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser  = require("cookie-parser");

const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { generalLimiter }         = require("./middlewares/rateLimiter.middleware");
const routes                     = require("./routes/index");

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());

// Prevent NoSQL injection: strips $ and . from user input
app.use(mongoSanitize());

app.use(cors({
  origin:      process.env.CLIENT_URL || "*",
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Rate Limiting ─────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Routes ────────────────────────────────────────────────
app.use("/api/v1", routes);

// ── Health Check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status:  "success",
    message: "Server is running",
    env:     process.env.NODE_ENV,
    version: "1.0.0",
    time:    new Date().toISOString(),
  });
});

// ── Error Handlers (must be last) ────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;