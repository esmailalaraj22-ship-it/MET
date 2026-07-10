const Joi = require("joi");

const updateProfileSchema = Joi.object({
  firstName:    Joi.string().min(2).max(50).optional(),
  secondName:   Joi.string().min(2).max(50).optional(),
  familyName:   Joi.string().min(2).max(50).optional(),
  profileImage: Joi.string().uri().optional().allow(null, ""),
});

const createInstructorSchema = Joi.object({
  firstName:    Joi.string().min(2).max(50).required().messages({ "any.required": "الاسم الأول مطلوب" }),
  secondName:   Joi.string().min(2).max(50).required().messages({ "any.required": "الاسم الثاني مطلوب" }),
  familyName:   Joi.string().min(2).max(50).required().messages({ "any.required": "اسم العائلة مطلوب" }),
  email:        Joi.string().email().required().messages({ "any.required": "البريد الإلكتروني مطلوب" }),
  password:     Joi.string().min(6).required().messages({ "any.required": "كلمة المرور مطلوبة" }),
  nationalId:   Joi.string().length(9).pattern(/^[0-9]+$/).required().messages({
    "any.required": "رقم الهوية الوطنية مطلوب",
    "string.length": "رقم الهوية يجب أن يكون 9 أرقام",
    "string.pattern.base": "رقم الهوية يجب أن يحتوي على أرقام فقط",
  }),
  phoneNumber:   Joi.string().optional().allow(null, ""),
  dateOfBirth:   Joi.date().optional().allow(null),
  paypalAccount: Joi.string().email().optional().allow(null, ""),
  bio:           Joi.string().max(1000).optional().allow(""),
  profileImage:  Joi.string().uri().optional().allow(null, ""),
});

const createCourseSchema = Joi.object({
  title:        Joi.string().min(3).max(200).required().messages({ "any.required": "عنوان الكورس مطلوب" }),
  description:  Joi.string().max(2000).optional().allow(""),
  instructorId: Joi.string().hex().length(24).optional().allow(null, ""),
  allowedUniversities: Joi.array().items(Joi.string().hex().length(24)).min(1).required().messages({
    "any.required": "يجب تحديد جامعة واحدة على الأقل",
  }),
  category:             Joi.string().optional().allow(""),
  level:                Joi.string().valid("beginner", "intermediate", "advanced").optional(),
  instructorPercentage: Joi.number().min(0).max(100).optional(),
  reservedPercentage:   Joi.number().min(0).max(100).optional(),
  metCost:              Joi.number().min(0).optional(),
  price:                Joi.number().min(0).optional(),
  thumbnail:            Joi.string().optional().allow(null, ""),
});

const createUniversitySchema = Joi.object({
  name:   Joi.string().min(2).max(200).required().messages({ "any.required": "اسم الجامعة مطلوب" }),
  nameEn: Joi.string().max(200).optional().allow(""),
  city:   Joi.string().max(100).optional().allow(""),
  logo:   Joi.string().uri().optional().allow(null, ""),
});

const applyDiscountSchema = Joi.object({
  type:  Joi.string().valid("percentage", "fixed").required(),
  value: Joi.number().min(0).required(),
});

const assignInstructorSchema = Joi.object({
  instructorId: Joi.string().hex().length(24).required(),
});

const addMetSchema = Joi.object({
  amount:      Joi.number().min(1).required().messages({ "any.required": "مقدار MET مطلوب" }),
  description: Joi.string().optional().allow(""),
});

const releasePaymentSchema = Joi.object({
  amount: Joi.number().min(1).required().messages({ "any.required": "المبلغ مطلوب" }),
  note:   Joi.string().optional().allow(""),
});

module.exports = {
  updateProfileSchema, createInstructorSchema, createCourseSchema,
  createUniversitySchema, applyDiscountSchema, assignInstructorSchema,
  addMetSchema, releasePaymentSchema,
};