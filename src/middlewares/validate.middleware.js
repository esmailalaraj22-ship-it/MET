const ApiError = require("../utils/ApiError");
const fs = require("fs/promises");

// Arabic display names for form fields — used inside error messages so the
// user knows exactly which input to fix
const FIELD_LABELS = {
  firstName:          "الاسم الأول",
  secondName:         "الاسم الثاني",
  familyName:         "اسم العائلة",
  name:               "الاسم",
  nameEn:             "الاسم بالإنجليزية",
  email:              "البريد الإلكتروني",
  password:           "كلمة المرور",
  confirmPassword:    "تأكيد كلمة المرور",
  currentPassword:    "كلمة المرور الحالية",
  newPassword:        "كلمة المرور الجديدة",
  confirmNewPassword: "تأكيد كلمة المرور الجديدة",
  nationalId:         "رقم الهوية الوطنية",
  phoneNumber:        "رقم الجوال",
  dateOfBirth:        "تاريخ الميلاد",
  paypalAccount:      "حساب PayPal",
  bio:                "النبذة التعريفية",
  profileImage:       "الصورة الشخصية",
  universityId:        "الجامعة",
  city:                "المدينة",
  logo:                "الشعار",
  title:               "العنوان",
  description:         "الوصف",
  instructorId:        "المدرس",
  allowedUniversities: "الجامعات المسموح لها",
  category:            "التصنيف",
  level:               "المستوى",
  metCost:             "تكلفة MET",
  price:               "السعر",
  thumbnail:           "الصورة المصغرة",
  instructorPercentage:"نسبة المدرس",
  reservedPercentage:  "النسبة المحجوزة",
  duration:            "المدة",
  order:               "الترتيب",
  isPublished:         "حالة النشر",
  amount:              "المبلغ",
  note:                "الملاحظة",
  type:                "النوع",
  value:               "القيمة",
};

// Arabic templates for every common Joi rule — covers fields whose schemas
// don't define their own custom Arabic messages
const ARABIC_MESSAGES = {
  "any.required":        "{#label} مطلوب",
  "any.only":            "{#label} غير متطابق أو قيمته غير مسموحة",
  "string.base":         "{#label} يجب أن يكون نصاً",
  "string.empty":        "{#label} لا يمكن أن يكون فارغاً",
  "string.min":          "{#label} يجب ألا يقل عن {#limit} أحرف",
  "string.max":          "{#label} يجب ألا يزيد عن {#limit} حرفاً",
  "string.length":       "{#label} يجب أن يكون {#limit} خانات بالضبط",
  "string.email":        "{#label} غير صالح — أدخل بريداً إلكترونياً صحيحاً",
  "string.pattern.base": "{#label} بصيغة غير صحيحة (أرقام فقط أو نمط محدد)",
  "string.uri":          "{#label} يجب أن يكون رابطاً صالحاً",
  "string.hex":          "{#label} بمعرف غير صالح",
  "number.base":         "{#label} يجب أن يكون رقماً",
  "number.min":          "{#label} يجب ألا يقل عن {#limit}",
  "number.max":          "{#label} يجب ألا يزيد عن {#limit}",
  "array.base":          "{#label} يجب أن يكون قائمة",
  "array.min":           "{#label}: يجب اختيار عنصر واحد على الأقل",
  "date.base":           "{#label} تاريخ غير صالح",
  "boolean.base":        "{#label} يجب أن يكون قيمة منطقية",
  "object.unknown":      "الحقل {#label} غير متوقع في هذا الطلب",
};

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    errors: { wrap: { label: false } },
    messages: ARABIC_MESSAGES,
  });
  if (error) {
    if (req.file?.path) fs.unlink(req.file.path).catch(() => {});
    const errors = error.details.map((d) => {
      const key = d.context?.key ?? d.path.join(".");
      const rawLabel = d.context?.label ?? key;
      // Joi prints the raw field key as the label — swap it for the Arabic name
      return d.message.split(rawLabel).join(FIELD_LABELS[key] || key);
    });
    // The specific reasons ARE the main message, so a frontend that only
    // shows `message` still tells the user exactly what to fix
    return next(new ApiError(400, errors.join("، "), errors));
  }
  next();
};

module.exports = validate;
