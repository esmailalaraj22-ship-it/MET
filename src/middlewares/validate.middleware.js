const ApiError = require("../utils/ApiError");

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return next(new ApiError(400, "بيانات غير صحيحة", errors));
  }
  next();
};

module.exports = validate;