const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const ApiError = require("../utils/ApiError");

// Store files in memory buffer — suitable for cloud upload (S3, Cloudflare R2)
// In production replace memoryStorage with multer-s3 or similar
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "application/pdf",
    "video/mp4", "video/mpeg", "video/quicktime", "video/webm",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `نوع الملف غير مدعوم: ${file.mimetype}`), false);
  }
};

const limits = { fileSize: 100 * 1024 * 1024 }; // 100 MB max

// Generic upload (single file)
const uploadSingle = (fieldName) =>
  multer({ storage, fileFilter, limits }).single(fieldName);

// Multiple files
const uploadMultiple = (fieldName, maxCount = 5) =>
  multer({ storage, fileFilter, limits }).array(fieldName, maxCount);

// Image only
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new ApiError(400, "يسمح فقط بملفات الصور"), false);
  },
}).single("image");

// Video lessons are stored locally for the university-project deployment.
// The uploads directory is gitignored and served by Express under /uploads.
const videoDirectory = path.join(__dirname, "../../uploads/videos");
fs.mkdirSync(videoDirectory, { recursive: true });

const videoExtensions = {
  "video/mp4": ".mp4",
  "video/mpeg": ".mpeg",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoDirectory),
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "video";
    const extension = videoExtensions[file.mimetype] || ".mp4";
    cb(null, `${Date.now()}-${originalName}${extension}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (videoExtensions[file.mimetype]) cb(null, true);
    else cb(new ApiError(400, "يسمح فقط بملفات الفيديو MP4 أو MPEG أو MOV أو WEBM"), false);
  },
}).single("video");

module.exports = { uploadSingle, uploadMultiple, uploadImage, uploadVideo };
