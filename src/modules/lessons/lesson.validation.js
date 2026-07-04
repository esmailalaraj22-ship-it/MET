const Joi = require("joi");

const createLessonSchema = Joi.object({
  title:       Joi.string().min(2).max(200).required().messages({ "any.required": "عنوان الدرس مطلوب" }),
  description: Joi.string().max(1000).optional().allow(""),
  duration:    Joi.number().min(0).optional(),
  order:       Joi.number().min(1).optional(),
  isPublished: Joi.boolean().optional(),
});

const updateLessonSchema = Joi.object({
  title:       Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(""),
  duration:    Joi.number().min(0).optional(),
  order:       Joi.number().min(1).optional(),
  isPublished: Joi.boolean().optional(),
});

module.exports = { createLessonSchema, updateLessonSchema };
