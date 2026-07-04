const ApiError = require("../utils/ApiError");
const fs = require("fs/promises");

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    if (req.file?.path) fs.unlink(req.file.path).catch(() => {});
    const errors = error.details.map((d) => d.message);
    return next(new ApiError(400, "بيانات غير صحيحة", errors));
  }
  next();
};

module.exports = validate;
