const Joi = require("joi");

const registerStudentSchema = Joi.object({
  firstName:  Joi.string().min(2).max(50).required().messages({ "any.required": "الاسم الأول مطلوب" }),
  secondName: Joi.string().min(2).max(50).required().messages({ "any.required": "الاسم الثاني مطلوب" }),
  familyName: Joi.string().min(2).max(50).required().messages({ "any.required": "اسم العائلة مطلوب" }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "البريد الإلكتروني غير صالح",
    "any.required": "البريد الإلكتروني مطلوب",
  }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    "any.required": "كلمة المرور مطلوبة",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only":    "كلمة المرور وتأكيدها غير متطابقتين",
    "any.required":"تأكيد كلمة المرور مطلوب",
  }),
  universityId: Joi.string().hex().length(24).required().messages({
    "any.required":  "يجب اختيار الجامعة",
    "string.length": "معرف الجامعة غير صالح",
    "string.hex":    "معرف الجامعة غير صالح",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "البريد الإلكتروني غير صالح",
    "any.required": "البريد الإلكتروني مطلوب",
  }),
  password: Joi.string().required().messages({ "any.required": "كلمة المرور مطلوبة" }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({ "any.required": "كلمة المرور الحالية مطلوبة" }),
  newPassword: Joi.string().min(6).max(100).required().messages({
    "string.min":  "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    "any.required":"كلمة المرور الجديدة مطلوبة",
  }),
  confirmNewPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only":    "تأكيد كلمة المرور الجديدة غير متطابق",
    "any.required":"تأكيد كلمة المرور الجديدة مطلوب",
  }),
});

module.exports = { registerStudentSchema, loginSchema, changePasswordSchema };