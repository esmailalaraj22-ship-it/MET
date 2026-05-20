const multer  = require("multer");
const path    = require("path");
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

module.exports = { uploadSingle, uploadMultiple, uploadImage };