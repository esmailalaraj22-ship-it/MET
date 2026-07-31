const Joi = require("joi");

const updateProfileSchema = Joi.object({
  firstName:     Joi.string().min(2).max(50).optional(),
  secondName:    Joi.string().min(2).max(50).optional(),
  familyName:    Joi.string().min(2).max(50).optional(),
  profileImage:  Joi.string().uri().optional().allow(null, ""),
  phoneNumber:   Joi.string().optional().allow(null, ""),
  dateOfBirth:   Joi.date().optional().allow(null, ""),
  paypalAccount: Joi.string().email().optional().allow(null, ""),
  bio:           Joi.string().max(1000).optional().allow(""),
}).min(1);

module.exports = { updateProfileSchema };
