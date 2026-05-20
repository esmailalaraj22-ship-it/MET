# دليل الباكند بالعربي — منصة التعليم العربية
## ARABIC_BACKEND_EXPLANATION.md

---

# القسم الأول: نظرة عامة على المشروع

## ما هو هذا المشروع؟

هذا هو باكند منصة تعليمية عربية مخصصة لطلاب الجامعات السعودية. المنصة تتيح للطلاب التسجيل في كورسات عبر الإنترنت، ومتابعة تقدمهم، والتفاعل مع المجتمع الأكاديمي.

## التقنيات المستخدمة

| التقنية | الاستخدام |
|--------|----------|
| Node.js + Express | إطار عمل الخادم |
| MongoDB + Mongoose | قاعدة البيانات |
| JWT | نظام المصادقة |
| bcryptjs | تشفير كلمات المرور |
| Socket.IO | الشات الفوري (مُعدّ للاستخدام) |

---

# القسم الثاني: هندسة المشروع

## لماذا اخترنا هذه البنية؟

اخترنا **Modular Monolith Architecture** — أي نظام واحد مقسّم إلى وحدات مستقلة.

**البديل كان Microservices** (خدمات مستقلة منفصلة) لكنه:
- يحتاج Docker, Kubernetes, وقواعد بيانات منفصلة
- معقد جداً لمشروع تخرج
- يزيد وقت التطوير بشكل كبير

**اخترنا Modular Monolith لأنه:**
- كل وحدة (module) مستقلة ولها ملفاتها الخاصة
- يمكن تحويله لـ Microservices لاحقاً بسهولة
- سهل التطوير والاختبار
- مناسب لمشروع التخرج والمنتج الحقيقي معاً

## مبدأ Separation of Concerns

كل ملف له مسؤولية واحدة فقط:

```
routes.js      → يحدد مسارات API فقط
controller.js  → يستقبل الطلب ويرسل الرد فقط
service.js     → يحتوي كل منطق العمل
model.js       → يحدد شكل البيانات في DB
middleware.js  → يعالج الطلب قبل وصوله للـ controller
```

---

# القسم الثالث: هيكل المجلدات

```
src/
├── config/
│   ├── db.js          ← الاتصال بـ MongoDB
│   ├── constants.js   ← الثوابت المشتركة
│   └── seed.js        ← إنشاء البيانات الأولية
│
├── modules/           ← قلب التطبيق
│   ├── auth/          ← تسجيل + دخول + JWT
│   ├── users/         ← نموذج المستخدم المشترك
│   ├── admin/         ← صلاحيات الأدمن
│   ├── students/      ← لوحة تحكم الطالب + MET
│   ├── instructors/   ← لوحة تحكم المدرس
│   ├── universities/  ← إدارة الجامعات
│   ├── courses/       ← نموذج الكورسات
│   ├── enrollments/   ← التسجيل في الكورسات
│   ├── lessons/       ← الدروس الفيديو
│   ├── assignments/   ← الواجبات + التسليمات
│   ├── exams/         ← الاختبارات + النتائج
│   ├── progress/      ← تتبع التقدم
│   ├── community/     ← المنشورات + التعليقات
│   ├── chat/          ← المحادثات + الرسائل
│   ├── notifications/ ← الإشعارات
│   └── finance/       ← المالية
│
├── middlewares/       ← طبقة المعالجة الوسيطة
├── utils/             ← أدوات مساعدة مشتركة
├── socket/            ← إعداد Socket.IO
├── routes/            ← تجميع كل المسارات
└── app.js             ← إعداد Express
```

---

# القسم الرابع: قاعدة البيانات

## لماذا MongoDB وليس SQL؟

- المحتوى التعليمي متغيّر: بعض الكورسات تحتوي كويزات، بعضها لا
- MongoDB يتعامل مع البيانات كـ JSON مباشرة — متوافق مع JavaScript
- يدعم التوسع الأفقي عند نمو المنصة
- المصفوفات (arrays) فيه طبيعية — مثل `allowedUniversities: [...]`

## نموذج Users — الهوية المركزية

كل شخص في المنصة (طالب، مدرس، أدمن) له document واحد في `users`.

```javascript
// لماذا دور واحد في مجموعة واحدة؟
// لأن Login يحتاج استعلاماً واحداً بغض النظر عن الدور
User.findOne({ email }) → يعمل لكل الأدوار
```

**لماذا `isActive` بدلاً من الحذف؟**
حذف المستخدم يحذف تاريخ التسجيلات والإجابات والرسائل. بدلاً من ذلك نوقف الحساب مؤقتاً (`isActive: false`) ويحتفظ بكل السجلات.

**لماذا `password: { select: false }`؟**
هذا يمنع إرسال كلمة المرور في أي استجابة API بشكل غير مقصود. يجب طلبها صراحةً: `User.findOne().select("+password")`.

## نموذج Students

```javascript
{
  userId:          ref: User,       // 1:1 relationship
  universityId:    ref: University, // الجامعة المرتبطة
  enrolledCourses: [ref: Course],   // الكورسات المسجّل فيها
  metPoints:       250,             // نقاط MET (الافتراضي 250)
  metTransactions: [...]            // سجل حركات MET
}
```

**لماذا فصل بيانات الطالب عن User؟**
مجموعة `users` تحتوي البيانات المشتركة (email, password, role). بيانات الطالب الخاصة (جامعته، كورساته، نقاط MET) في مجموعة منفصلة حتى لا تتضخم `users`.

## نموذج Courses — الحقل الأهم

```javascript
{
  allowedUniversities: [ObjectId, ObjectId, ...],
  metCost:             50,   // كم MET يحتاج الطالب للتسجيل
  instructorPercentage: 40,  // نسبة المدرس من الدخل
  reservedPercentage:   20,  // نسبة الأكاديمية المحجوزة
  totalIncome:          1500, // إجمالي ما جُمع (بـ MET)
}
```

**كيف يعمل فلتر الجامعة؟**
```javascript
// عندما يبحث الطالب عن كورسات:
Course.find({
  isPublished: true,
  allowedUniversities: student.universityId  // MongoDB يبحث داخل المصفوفة
})
// الطالب لا يرى أي كورس خارج جامعته تلقائياً
```

## نموذج Enrollments — العلاقة بين الطالب والكورس

```javascript
{
  studentId: ref: Student,
  courseId:  ref: Course,
  status:    "active|completed|dropped"
}
// Index فريد مركب يمنع التسجيل المكرر:
{ studentId: 1, courseId: 1 } unique
```

**لماذا مجموعة منفصلة وليس مصفوفة في Student؟**
- نحتاج بيانات إضافية لكل تسجيل (تاريخ، حالة)
- الاستعلام `Enrollment.find({ courseId: X })` أسرع من فحص كل طالب

## نموذج Exams — النظام المتقدم

```javascript
{
  questions: [
    {
      questionType: "mcq",       // اختيار متعدد: تصحيح تلقائي
      options:      ["أ","ب","ج","د"],  // 4-7 خيارات
      correctAnswer: 1,          // index الإجابة الصحيحة
    },
    {
      questionType: "written",   // مكتوب: يصحّحه المدرس يدوياً
    }
  ],
  startTime:             Date,   // وقت بدء الاختبار
  endTime:               Date,   // وقت انتهائه
  showGradesImmediately: Boolean,// هل تظهر الدرجات فوراً؟
}
```

## نموذج ExamResult — تتبع تعديلات المدرس

```javascript
{
  score:                Number,
  isManuallyModified:   Boolean,  // هل عدّل المدرس الدرجة؟
  manualModifiedBy:     ref: User,
  manualModifiedAt:     Date,
  gradeVisible:         Boolean,  // هل يرى الطالب درجته؟
}
```

عندما `isManuallyModified = true`، يرى الطالب: **"تم تعديل الدرجة من قبل المدرس"**

## نموذج Posts — المجتمع العام والخاص بكورس واحد

```javascript
{
  courseId: null        // → مجتمع عام
  courseId: ObjectId    // → مجتمع خاص بكورس
}
```

نفس الـ collection لكليهما! الفصل يحدث بحقل `courseId` فقط. هذا يوفّر تكرار الكود.

## نموذج InstructorFinance

```javascript
{
  totalEarned:   1500,  // إجمالي ما كسبه المدرس (MET)
  totalReserved: 300,   // المحجوز لدى الأكاديمية
  totalReleased: 900,   // ما تم دفعه للمدرس
  transactions:  [...]  // سجل كل عملية
}
```

---

# القسم الخامس: نظام المصادقة والصلاحيات

## لماذا JWT وليس Sessions؟

| Sessions | JWT |
|----------|-----|
| تحتاج تخزين في الخادم | لا تحتاج تخزين |
| لا تعمل مع multiple servers | تعمل مع أي سيرفر |
| تحتاج Redis عند التوسع | Stateless تماماً |

## نظام الـ Double Token

```
تسجيل دخول ← Access Token (7 أيام) + Refresh Token (30 يوم)

كل طلب API ← أرسل Access Token في header
الـ Token ينتهي ← أرسل Refresh Token ← احصل على Access جديد
تسجيل خروج ← احذف Refresh Token من DB ← لا يمكن تجديد الـ Token
```

**لماذا نحفظ Refresh Token في DB؟**
حتى نتمكن من إلغائه — إذا سُرق حساب نحذف Token من DB فيتوقف عن العمل فوراً.

## نظام الأدوار (RBAC)

```
student    → يرى كورسات جامعته فقط، يسجّل، يتفاعل مع المجتمع
instructor → يدير محتوى كورساته فقط، يشات مع طلابه
admin      → يملك صلاحية كاملة على كل شيء
```

**التحقق يحدث في مرحلتين:**
```javascript
// المرحلة 1: هل أنت مسجل دخول؟
protect middleware → يتحقق من JWT ويحمّل بيانات المستخدم

// المرحلة 2: هل لديك الصلاحية؟
authorize("admin") → يتحقق من req.user.role
```

---

# القسم السادس: نظام نقاط MET

## كيف يعمل النظام؟

```
1 MET = 2 دولار أمريكي

كل طالب جديد ← يحصل تلقائياً على 250 MET (= 500 دولار)
الأدمن ← يحدد تكلفة كل كورس بـ MET عند الإنشاء
الطالب ← يدفع MET للتسجيل في الكورس
```

## منطق خصم MET عند التسجيل

```javascript
// 1. احسب التكلفة الفعلية بعد الخصم
let finalCost = course.metCost;
if (student.discount?.type === "percentage") {
  finalCost = Math.round(course.metCost * (1 - discount.value / 100));
}

// 2. تحقق أن الطالب يملك كافياً
if (student.metPoints < finalCost) {
  throw error("نقاط MET غير كافية");
}

// 3. اخصم + سجّل العملية
student.metPoints -= finalCost;
student.metTransactions.push({ amount: -finalCost, type: "debit", ... });

// 4. وزّع الدخل
totalIncome  += finalCost
instructorEarns = finalCost * (instructorPercentage / 100)
academyReserves = finalCost * (reservedPercentage / 100)
```

---

# القسم السابع: نظام الكورسات

## دورة حياة الكورس

```
1. الأدمن ينشئ الكورس (يحدد: الجامعات، التكلفة بـ MET، نسبة المدرس)
2. الأدمن يعيّن مدرساً للكورس
3. المدرس يرفع الدروس والواجبات والاختبارات
4. الأدمن ينشر الكورس (isPublished: true)
5. الطلاب يرون الكورس في قائمة "الكورسات المتاحة"
6. الطالب يسجّل (يُخصم MET)
7. الطالب يتابع المحتوى ويتتبع تقدمه
```

## صلاحيات المدرس داخل الكورس

المدرس يستطيع:
- رفع دروس فيديو
- إنشاء واجبات وتحديد نوع التسليم
- إنشاء اختبارات بأسئلة MCQ ومكتوبة
- تصحيح الواجبات والإجابات المكتوبة
- تعديل درجة أي اختبار يدوياً
- حذف منشورات الطلاب في مجتمع الكورس (لا يستطيع حذف منشورات الأدمن)
- رؤية تقدم كل طالب

---

# القسم الثامن: نظام الاختبارات

## أنواع الأسئلة

**1. اختيار متعدد (MCQ) — تصحيح تلقائي:**
- 4 إلى 7 خيارات
- المدرس يحدد الإجابة الصحيحة عند الإنشاء
- الدرجة تُحسب فوراً عند التسليم

**2. سؤال مكتوب — تصحيح يدوي:**
- الطالب يكتب إجابة نصية
- المدرس يراجعها ويعطي الدرجة
- حتى يصحح المدرس: الدرجة `null`

## التحكم في الوقت

```
قبل startTime  → "الاختبار لم يبدأ بعد"
بين start-end  → متاح للتسليم ✓
بعد endTime    → "انتهى وقت الاختبار"
```

## رؤية الدرجات

```
showGradesImmediately: true  → الطالب يرى درجته فور التسليم
showGradesImmediately: false → الدرجات مخفية حتى يرفعها المدرس
```

عند رفع الدرجات: `POST /courses/:id/exams/:id/release-grades`

## تعديل الدرجة يدوياً

عندما يعدّل المدرس درجة الطالب يدوياً:
- `isManuallyModified = true`
- الطالب يرى: **"تم تعديل الدرجة من قبل المدرس"**
- الأدمن يرى نفس الرسالة + اسم المدرس + وقت التعديل

---

# القسم التاسع: نظام الواجبات

## أنواع التسليم

```
"any"   → أي نوع (PDF، صورة، أو نص)
"pdf"   → PDF فقط
"image" → صورة فقط
"text"  → نص فقط
```

## ترتيب التسليمات (من منظور المدرس)

عند فتح الواجب، يرى المدرس الطلاب مرتبين:
1. **المبكرون** — سلّموا قبل الموعد النهائي
2. **المتأخرون** — سلّموا بعد الموعد
3. **لم يسلّموا** — ما زالوا بدون تسليم

---

# القسم العاشر: نظام المجتمعات

## المجتمع العام

- متاح لجميع المستخدمين المسجلين
- نقاشات عامة، نصائح، تجارب
- `courseId: null` في قاعدة البيانات

## مجتمع الكورس

- خاص بكل كورس
- فقط الطلاب المسجلين + المدرس + الأدمن
- `courseId: ObjectId` في قاعدة البيانات
- المدرس يمكنه حذف منشورات الطلاب
- الأدمن يمكنه حذف أي منشور

## قاعدة واحدة للمجتمعين!

نستخدم نفس الـ collection `posts` للمجتمعين. التمييز يحدث بـ `courseId`:
- `null` = عام
- `ObjectId` = خاص بكورس

هذا يوفّر كتابة كود مكرر.

---

# القسم الحادي عشر: نظام الإشعارات

## كيف تُنشأ الإشعارات؟

| الحدث | من يُشعَر |
|-------|---------|
| درس جديد | جميع طلاب الكورس |
| واجب جديد | جميع طلاب الكورس |
| اختبار جديد | جميع طلاب الكورس |
| تعليق على منشور | صاحب المنشور فقط |
| بث الأدمن | جميع المستخدمين |

## تحسين الأداء — insertMany

عند إشعار 500 طالب، لا ندخل loop ونرسل 500 طلب لـ DB:
```javascript
// ❌ بطيء — 500 طلب DB
for (const student of students) {
  await Notification.create({ userId: student.userId, ... });
}

// ✅ سريع — طلب DB واحد
const notifications = students.map(s => ({ userId: s.userId, ... }));
await Notification.insertMany(notifications);
```

---

# القسم الثاني عشر: نظام الشات

## الهيكل الحالي (REST API)

```
Conversation: { participants: [userId1, userId2], courseId }
Message:      { conversationId, senderId, content, type, isRead }
```

## Real-time مع Socket.IO (جاهز للتفعيل)

الكود موجود في `src/socket/socket.js` ومفعّل في `server.js`:

```javascript
// الاتصال من الـ Frontend:
const socket = io("http://localhost:5000", {
  auth: { token: "Bearer " + accessToken }
});

socket.emit("join_conversation", conversationId);
socket.emit("send_message", { conversationId, content: "مرحباً" });
socket.on("new_message", (data) => { /* تحديث الواجهة */ });
```

**قيود الشات:**
- الطالب لا يشات إلا مع مدرسي كورساته
- المدرس يشات مع طلابه + الأدمن

---

# القسم الثالث عشر: المالية

## دورة المال في المنصة

```
طالب يسجل في كورس بـ 100 MET
    ↓
course.totalIncome += 100
instructor.totalEarned += 40 MET  (40% نسبة المدرس)
academy.reserved += 20 MET         (20% محجوز)
academy.profit = 40 MET            (40% للأكاديمية)
    ↓
الأدمن يقرر إطلاق 40 MET للمدرس عبر PayPal
    ↓
instructor.totalReserved -= 40
instructor.totalReleased += 40
```

## لوحة المالية للأدمن

```
إجمالي الدخل  = مجموع كل course.totalIncome
المحجوز        = مجموع نسب المدرسين من كل الكورسات
صافي الربح     = إجمالي الدخل - المحجوز للمدرسين
```

---

# القسم الرابع عشر: الأمان

| الطبقة | الأداة | الغرض |
|--------|--------|-------|
| HTTP Headers | helmet | منع XSS, Clickjacking |
| CORS | cors | تحديد النطاقات المسموحة |
| NoSQL Injection | mongoSanitize | منع `{$gt: ""}` في الـ body |
| Rate Limiting | express-rate-limit | 10 محاولات login / 15 دقيقة |
| Password | bcrypt cost=12 | تشفير غير قابل للعكس |
| National ID | AES-256-CBC | تشفير قابل للعكس للبيانات الحساسة |
| Cookie | httpOnly: true | منع JavaScript من قراءة refresh token |

---

# القسم الخامس عشر: معالجة الأخطاء

## لماذا معالجة مركزية؟

بدونها، كل controller يحتاج:
```javascript
try { ... } catch(err) { res.status(500).json({ error: err.message }) }
```

مع المعالجة المركزية:
```javascript
throw new ApiError(404, "المدرس غير موجود");
// يصل تلقائياً لـ error.middleware.js
```

## asyncHandler

Express يلتقط الأخطاء المتزامنة تلقائياً، لكن ليس الـ async:
```javascript
// ❌ يكسر السيرفر إذا DB فشلت
router.get("/", async (req, res) => {
  const data = await Model.find(); // ماذا لو فشل؟
});

// ✅ asyncHandler يلتقط الخطأ ويمرره للـ error handler
router.get("/", asyncHandler(async (req, res) => {
  const data = await Model.find();
}));
```

---

# القسم السادس عشر: الـ Pagination

كل endpoint يعيد قائمة يدعم pagination:

```javascript
GET /admin/students?page=2&limit=10
Response:
{
  "pagination": {
    "total": 450,
    "page": 2,
    "limit": 10,
    "totalPages": 45,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

# القسم السابع عشر: خطوات التشغيل

## التثبيت

```bash
npm install express mongoose dotenv bcryptjs jsonwebtoken \
  helmet cors express-rate-limit express-mongo-sanitize \
  joi morgan slugify express-async-errors cookie-parser \
  multer socket.io

npm install -D nodemon
```

## الإعداد

```bash
# نسخ ملف البيئة
cp .env.example .env
# تعديل MONGO_URI في .env

# بذر البيانات الأولية (مرة واحدة)
npm run seed

# تشغيل السيرفر
npm run dev
```

## بيانات الأدمن الأولية

```
admin1@edu.com  /  123456789
admin2@edu.com  /  123456789
admin3@edu.com  /  123456789
```

## أول اختبار في Postman

```
POST http://localhost:5000/api/v1/auth/login
Body: { "email": "admin1@edu.com", "password": "123456789" }
← انسخ accessToken
GET http://localhost:5000/api/v1/admin/stats
Header: Authorization: Bearer <token>
```

---

# القسم الثامن عشر: قائمة Collections

| Collection | المحتوى |
|-----------|---------|
| users | هوية جميع المستخدمين |
| students | بيانات الطلاب + MET |
| instructors | بيانات المدرسين |
| admins | بيانات الأدمن |
| universities | الجامعات المعتمدة |
| courses | الكورسات |
| enrollments | تسجيلات الطلاب |
| lessons | دروس الفيديو |
| assignments | الواجبات |
| submissions | تسليمات الواجبات |
| exams | الاختبارات |
| examresults | نتائج الاختبارات |
| progress | تقدم الطلاب |
| posts | منشورات المجتمعين |
| comments | التعليقات |
| conversations | المحادثات |
| messages | الرسائل |
| notifications | الإشعارات |
| instructorfinances | السجلات المالية للمدرسين |

**المجموع: 19 collection**

---

*توثيق كامل للمنصة التعليمية العربية — مشروع تخرج جامعي*
*آخر تحديث: النسخة النهائية الكاملة*