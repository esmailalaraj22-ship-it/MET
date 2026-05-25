const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "منصة التعليم العربية — API",
      version: "1.0.0",
      description: "Arabic Educational Platform - Complete API Documentation",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://met-efgo.onrender.com/api/v1"
          : "http://localhost:5000/api/v1",
        description: process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "أدخل الـ Token هنا بعد تسجيل الدخول",
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Auth",          description: "تسجيل الدخول والمصادقة" },
      { name: "Universities",  description: "الجامعات" },
      { name: "Student",       description: "لوحة الطالب" },
      { name: "Instructor",    description: "لوحة المدرس" },
      { name: "Admin",         description: "لوحة الأدمن" },
      { name: "Courses",       description: "الكورسات والمحتوى" },
      { name: "Assignments",   description: "الواجبات" },
      { name: "Exams",         description: "الاختبارات" },
      { name: "Progress",      description: "تتبع التقدم" },
      { name: "Community",     description: "المجتمعات" },
      { name: "Chat",          description: "الشات" },
      { name: "Notifications", description: "الإشعارات" },
    ],
    paths: {
      // ── AUTH ──────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "تسجيل طالب جديد",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName","secondName","familyName","email","password","confirmPassword","universityId"],
                  properties: {
                    firstName:       { type: "string", example: "محمد" },
                    secondName:      { type: "string", example: "عبدالله" },
                    familyName:      { type: "string", example: "الأحمدي" },
                    email:           { type: "string", example: "student@example.com" },
                    password:        { type: "string", example: "123456" },
                    confirmPassword: { type: "string", example: "123456" },
                    universityId:    { type: "string", example: "665a3f2b1c4e8d0012345678" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "تم إنشاء الحساب بنجاح" },
            400: { description: "بيانات غير صحيحة" },
            409: { description: "البريد الإلكتروني مستخدم مسبقاً" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "تسجيل الدخول (جميع الأدوار)",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email:    { type: "string", example: "admin1@edu.com" },
                    password: { type: "string", example: "123456789" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "تم تسجيل الدخول — يحتوي accessToken" },
            401: { description: "بيانات خاطئة" },
            403: { description: "الحساب معطّل" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "تسجيل الخروج",
          responses: { 200: { description: "تم تسجيل الخروج" } },
        },
      },
      "/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "تغيير كلمة المرور",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    currentPassword:    { type: "string" },
                    newPassword:        { type: "string" },
                    confirmNewPassword: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "تم تغيير كلمة المرور" } },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "بيانات المستخدم الحالي",
          responses: { 200: { description: "بيانات المستخدم" } },
        },
      },

      // ── UNIVERSITIES ──────────────────────────────────────
      "/universities": {
        get: {
          tags: ["Universities"],
          summary: "قائمة الجامعات (عام — لنموذج التسجيل)",
          security: [],
          responses: { 200: { description: "قائمة الجامعات النشطة" } },
        },
      },

      // ── STUDENT ───────────────────────────────────────────
      "/student/dashboard": {
        get: {
          tags: ["Student"],
          summary: "لوحة تحكم الطالب",
          responses: { 200: { description: "بيانات الداشبورد" } },
        },
      },
      "/student/courses/available": {
        get: {
          tags: ["Student"],
          summary: "الكورسات المتاحة (مفلترة بجامعة الطالب)",
          parameters: [
            { name: "page",     in: "query", schema: { type: "integer" } },
            { name: "limit",    in: "query", schema: { type: "integer" } },
            { name: "search",   in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "level",    in: "query", schema: { type: "string", enum: ["beginner","intermediate","advanced"] } },
          ],
          responses: { 200: { description: "قائمة الكورسات مع canAfford و isEnrolled" } },
        },
      },
      "/student/courses/{courseId}/enroll": {
        post: {
          tags: ["Student"],
          summary: "التسجيل في كورس (يخصم MET)",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            201: { description: "تم التسجيل — metDeducted + metRemaining" },
            400: { description: "نقاط MET غير كافية" },
            409: { description: "مسجل مسبقاً" },
          },
        },
      },
      "/student/courses/{courseId}/content": {
        get: {
          tags: ["Student"],
          summary: "محتوى الكورس (للمسجلين فقط)",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "دروس + واجبات + اختبارات + تقدم" } },
        },
      },
      "/student/met/history": {
        get: {
          tags: ["Student"],
          summary: "سجل نقاط MET",
          responses: { 200: { description: "الرصيد الحالي + سجل العمليات" } },
        },
      },
      "/student/chat/instructors": {
        get: {
          tags: ["Student"],
          summary: "مدرسو الشات (مدرسو كورسات الطالب فقط)",
          responses: { 200: { description: "قائمة المدرسين المتاحين" } },
        },
      },

      // ── PROGRESS ──────────────────────────────────────────
      "/progress/overview": {
        get: {
          tags: ["Progress"],
          summary: "نظرة عامة على التقدم في جميع الكورسات",
          responses: { 200: { description: "تقدم الطالب" } },
        },
      },
      "/progress/courses/{courseId}/lessons/{lessonId}": {
        patch: {
          tags: ["Progress"],
          summary: "وضع علامة شاهدت هذا الدرس",
          parameters: [
            { name: "courseId",  in: "path", required: true, schema: { type: "string" } },
            { name: "lessonId",  in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "النسبة المحدّثة" } },
        },
      },

      // ── INSTRUCTOR ────────────────────────────────────────
      "/instructor/dashboard": {
        get: {
          tags: ["Instructor"],
          summary: "لوحة تحكم المدرس",
          responses: { 200: { description: "بيانات الداشبورد + إحصائيات" } },
        },
      },
      "/instructor/finance": {
        get: {
          tags: ["Instructor"],
          summary: "التقرير المالي للمدرس",
          responses: { 200: { description: "الأرباح + المحجوز + المُصرف" } },
        },
      },
      "/instructor/courses/{courseId}/students": {
        get: {
          tags: ["Instructor"],
          summary: "طلاب الكورس مع تقدمهم",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "قائمة الطلاب + تقدم + سبق التعرف؟" } },
        },
      },

      // ── ADMIN ─────────────────────────────────────────────
      "/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "إحصائيات المنصة",
          responses: { 200: { description: "أعداد + مالية" } },
        },
      },
      "/admin/universities": {
        post: {
          tags: ["Admin"],
          summary: "إضافة جامعة",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name:   { type: "string", example: "جامعة طيبة" },
                    nameEn: { type: "string", example: "Taibah University" },
                    city:   { type: "string", example: "المدينة المنورة" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إنشاء الجامعة" } },
        },
        get: {
          tags: ["Admin"],
          summary: "قائمة الجامعات",
          parameters: [
            { name: "page",   in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "قائمة الجامعات" } },
        },
      },
      "/admin/instructors": {
        post: {
          tags: ["Admin"],
          summary: "إضافة مدرس",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName","secondName","familyName","email","password","nationalId"],
                  properties: {
                    firstName:    { type: "string", example: "أحمد" },
                    secondName:   { type: "string", example: "محمد" },
                    familyName:   { type: "string", example: "السعيد" },
                    email:        { type: "string", example: "instructor@edu.com" },
                    password:     { type: "string", example: "pass123" },
                    nationalId:   { type: "string", example: "1234567890" },
                    paypalAccount:{ type: "string", example: "pay@paypal.com" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إنشاء حساب المدرس" } },
        },
        get: {
          tags: ["Admin"],
          summary: "قائمة المدرسين",
          parameters: [{ name: "search", in: "query", schema: { type: "string" } }],
          responses: { 200: { description: "قائمة المدرسين" } },
        },
      },
      "/admin/courses": {
        post: {
          tags: ["Admin"],
          summary: "إنشاء كورس",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title","allowedUniversities"],
                  properties: {
                    title:                { type: "string", example: "Python للمبتدئين" },
                    description:          { type: "string" },
                    instructorId:         { type: "string" },
                    allowedUniversities:  { type: "array", items: { type: "string" } },
                    metCost:              { type: "number", example: 50 },
                    instructorPercentage: { type: "number", example: 40 },
                    reservedPercentage:   { type: "number", example: 20 },
                    level:                { type: "string", enum: ["beginner","intermediate","advanced"] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إنشاء الكورس" } },
        },
        get: {
          tags: ["Admin"],
          summary: "قائمة الكورسات",
          responses: { 200: { description: "قائمة الكورسات" } },
        },
      },
      "/admin/students": {
        get: {
          tags: ["Admin"],
          summary: "قائمة الطلاب مع فلاتر",
          parameters: [
            { name: "email",        in: "query", schema: { type: "string" } },
            { name: "name",         in: "query", schema: { type: "string" } },
            { name: "universityId", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "قائمة الطلاب" } },
        },
      },
      "/admin/students/{id}/met": {
        patch: {
          tags: ["Admin"],
          summary: "إضافة نقاط MET لطالب",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount:      { type: "number", example: 100 },
                    description: { type: "string", example: "منحة تعليمية" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "تم إضافة نقاط MET" } },
        },
      },
      "/admin/finance/payments": {
        get: {
          tags: ["Admin"],
          summary: "مستحقات المدرسين",
          responses: { 200: { description: "قائمة المدفوعات" } },
        },
      },
      "/admin/finance/instructors/{instructorId}/release": {
        post: {
          tags: ["Admin"],
          summary: "صرف مبلغ لمدرس",
          parameters: [{ name: "instructorId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number", example: 200 },
                    note:   { type: "string", example: "دفعة شهر مارس" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "تم الصرف" } },
        },
      },

      // ── COURSES CONTENT ───────────────────────────────────
      "/courses/{courseId}/lessons": {
        get: {
          tags: ["Courses"],
          summary: "قائمة الدروس",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "قائمة الدروس" } },
        },
        post: {
          tags: ["Courses"],
          summary: "إضافة درس (أدمن / مدرس)",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title:       { type: "string", example: "الدرس الأول" },
                    videoUrl:    { type: "string", example: "https://example.com/v.mp4" },
                    duration:    { type: "number", example: 1800 },
                    order:       { type: "number", example: 1 },
                    isPublished: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إضافة الدرس + إشعار للطلاب" } },
        },
      },
      "/courses/{courseId}/assignments": {
        get: {
          tags: ["Assignments"],
          summary: "قائمة الواجبات",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "قائمة الواجبات" } },
        },
        post: {
          tags: ["Assignments"],
          summary: "إضافة واجب",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title:          { type: "string", example: "واجب الأسبوع الأول" },
                    description:    { type: "string" },
                    submissionType: { type: "string", enum: ["any","pdf","image","text"], example: "any" },
                    dueDate:        { type: "string", example: "2025-03-15T23:59:00Z" },
                    maxScore:       { type: "number", example: 100 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إضافة الواجب" } },
        },
      },
      "/courses/{courseId}/assignments/{assignmentId}/submit": {
        post: {
          tags: ["Assignments"],
          summary: "تسليم واجب (طالب)",
          parameters: [
            { name: "courseId",     in: "path", required: true, schema: { type: "string" } },
            { name: "assignmentId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    submissionType: { type: "string", enum: ["text","pdf","image"] },
                    textAnswer:     { type: "string" },
                    fileUrl:        { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم التسليم" }, 409: { description: "سلّمت مسبقاً" } },
        },
      },
      "/courses/{courseId}/exams": {
        get: {
          tags: ["Exams"],
          summary: "قائمة الاختبارات",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "قائمة الاختبارات مع status" } },
        },
        post: {
          tags: ["Exams"],
          summary: "إنشاء اختبار",
          parameters: [{ name: "courseId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title:                 { type: "string" },
                    duration:              { type: "number", example: 30 },
                    passingScore:          { type: "number", example: 60 },
                    isPublished:           { type: "boolean" },
                    startTime:             { type: "string" },
                    endTime:               { type: "string" },
                    showGradesImmediately: { type: "boolean" },
                    questions:             { type: "array" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم إنشاء الاختبار" } },
        },
      },
      "/courses/{courseId}/exams/{examId}/submit": {
        post: {
          tags: ["Exams"],
          summary: "تقديم اختبار (طالب)",
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "examId",   in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    timeTaken: { type: "number", example: 900 },
                    answers:   { type: "array", example: [{ mcqAnswer: 2 }, { writtenAnswer: "..." }] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "تم التقديم — score + gradeVisible" },
            400: { description: "خارج وقت الاختبار" },
            409: { description: "قدّمت مسبقاً" },
          },
        },
      },
      "/courses/{courseId}/exams/{examId}/my-result": {
        get: {
          tags: ["Exams"],
          summary: "نتيجتي في الاختبار (طالب)",
          parameters: [
            { name: "courseId", in: "path", required: true, schema: { type: "string" } },
            { name: "examId",   in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "النتيجة + gradeNote إذا عدّل المدرس" } },
        },
      },

      // ── COMMUNITY ─────────────────────────────────────────
      "/community/posts": {
        get: {
          tags: ["Community"],
          summary: "منشورات المجتمع العام",
          parameters: [
            { name: "page",  in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { 200: { description: "قائمة المنشورات" } },
        },
        post: {
          tags: ["Community"],
          summary: "إنشاء منشور في المجتمع العام",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { content: { type: "string" } },
                },
              },
            },
          },
          responses: { 201: { description: "تم النشر" } },
        },
      },

      // ── CHAT ──────────────────────────────────────────────
      "/chat": {
        get: {
          tags: ["Chat"],
          summary: "قائمة المحادثات",
          responses: { 200: { description: "المحادثات مع آخر رسالة" } },
        },
        post: {
          tags: ["Chat"],
          summary: "بدء محادثة جديدة",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    targetUserId: { type: "string" },
                    courseId:     { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "المحادثة (جديدة أو موجودة)" } },
        },
      },
      "/chat/{conversationId}/messages": {
        get: {
          tags: ["Chat"],
          summary: "رسائل محادثة",
          parameters: [{ name: "conversationId", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "الرسائل" } },
        },
        post: {
          tags: ["Chat"],
          summary: "إرسال رسالة",
          parameters: [{ name: "conversationId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    type:    { type: "string", enum: ["text","image","file"] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "تم الإرسال" } },
        },
      },

      // ── NOTIFICATIONS ─────────────────────────────────────
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "إشعاراتي",
          parameters: [{ name: "unread", in: "query", schema: { type: "boolean" } }],
          responses: { 200: { description: "قائمة الإشعارات + unreadCount" } },
        },
      },
      "/notifications/read-all": {
        patch: {
          tags: ["Notifications"],
          summary: "تحديد كل الإشعارات كمقروءة",
          responses: { 200: { description: "تم" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;