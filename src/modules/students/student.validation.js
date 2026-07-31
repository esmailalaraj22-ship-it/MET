const Joi = require("joi");

const updateProfileSchema = Joi.object({
  firstName:    Joi.string().min(2).max(50).optional(),
  secondName:   Joi.string().min(2).max(50).optional(),
  familyName:   Joi.string().min(2).max(50).optional(),
  profileImage: Joi.string().uri().optional().allow(null, ""),
}).min(1);

module.exports = { updateProfileSchema };
