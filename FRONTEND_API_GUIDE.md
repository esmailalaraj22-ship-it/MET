# FRONTEND API GUIDE
## Arabic Educational Platform — Complete API Reference

> Base URL: `http://localhost:5000/api/v1`
> All protected routes require: `Authorization: Bearer <accessToken>`
> All responses follow the format: `{ status, message, data }` or `{ status, message, pagination, data }`

---

## AUTHENTICATION

### Register Student
```
POST /auth/register
Body:
{
  "firstName": "محمد",
  "secondName": "عبدالله",
  "familyName": "الأحمدي",
  "email": "student@example.com",
  "password": "pass123",
  "confirmPassword": "pass123",
  "universityId": "64a1b2c3d4e5f6789012345a"
}
Response 201:
{
  "status": "success",
  "message": "تم إنشاء الحساب بنجاح",
  "data": {
    "user": { "id": "...", "fullName": "محمد عبدالله الأحمدي", "email": "...", "role": "student" },
    "university": { "id": "...", "name": "جامعة الملك سعود" }
  }
}
Note: Student automatically receives 250 MET points on registration.
```

### Login (All Roles)
```
POST /auth/login
Body: { "email": "admin1@edu.com", "password": "123456789" }
Response 200:
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "fullName": "...", "role": "admin" }
  }
}
Note: Refresh token is set as httpOnly cookie automatically.
```

### Refresh Token
```
POST /auth/refresh-token
Body: { "refreshToken": "..." }   OR send via cookie automatically
Response: { "data": { "accessToken": "..." } }
```

### Logout
```
POST /auth/logout       [Protected]
Response: { "message": "تم تسجيل الخروج بنجاح" }
```

### Change Password
```
POST /auth/change-password    [Protected]
Body: { "currentPassword": "...", "newPassword": "...", "confirmNewPassword": "..." }
```

### Get Current User
```
GET /auth/me    [Protected]
Response: { "data": { "user": { "id", "fullName", "email", "role", "profileImage" } } }
```

---

## PUBLIC ENDPOINTS

### Get Universities (for registration dropdown)
```
GET /universities
Response: { "data": { "universities": [{ "id", "name", "nameEn", "city", "logo" }] } }
```

---

## STUDENT ENDPOINTS    [role: student]

### Dashboard
```
GET /student/dashboard
Response:
{
  "data": {
    "student": {
      "id": "...",
      "userId": { "fullName": "...", "email": "...", "profileImage": "..." },
      "university": { "name": "جامعة الملك سعود" },
      "metPoints": 220,
      "discount": null
    },
    "enrolledCourses": [
      {
        "course": { "title": "...", "thumbnail": "...", "totalLessons": 12 },
        "progress": { "percentage": 45, "lastAccessedAt": "2024-01-15T..." },
        "enrollment": { "enrolledAt": "...", "status": "active" }
      }
    ],
    "totalEnrolled": 2
  }
}
```

### Browse Available Courses (filtered by university)
```
GET /student/courses/available?page=1&limit=10&category=programming&level=beginner&search=python
Response:
{
  "pagination": { "total": 15, "page": 1, "limit": 10, "myMetPoints": 220 },
  "data": [
    {
      "title": "...",
      "metCost": 50,
      "metCostDisplay": "50 MET (≈ 100 USD)",
      "isEnrolled": false,
      "canAfford": true
    }
  ]
}
```

### Enroll in Course (deducts MET)
```
POST /student/courses/:courseId/enroll
Response 201:
{
  "data": {
    "message": "تم التسجيل بنجاح",
    "metDeducted": 50,
    "metRemaining": 170
  }
}
Error 400: "نقاط MET غير كافية. تحتاج 50 MET، لديك 30 MET فقط"
Error 409: "أنت مسجل في هذا الكورس بالفعل"
```

### Drop Course
```
DELETE /student/courses/:courseId/drop
```

### Get Course Content (enrolled students only)
```
GET /student/courses/:courseId/content
Response:
{
  "data": {
    "course": { "title": "...", "instructor": { ... } },
    "lessons": [{ "title", "videoUrl", "duration", "order", "isPublished" }],
    "assignments": [{ "title", "dueDate", "maxScore", "submissionType" }],
    "exams": [{ "title", "type", "duration", "status": "active|upcoming|ended" }],
    "progress": { "percentage": 45, "completedLessons": [...] }
  }
}
```

### Get Chat Instructors Sidebar
```
GET /student/chat/instructors
Response: { "data": { "instructors": [{ "instructor": {...}, "courses": [{...}] }] } }
```

### MET Points History
```
GET /student/met/history
Response:
{
  "data": {
    "currentMet": 170,
    "currentUSD": 340,
    "transactions": [
      { "amount": -50, "type": "debit", "description": "التسجيل في كورس: Python", "createdAt": "..." }
    ]
  }
}
```

---

## PROGRESS TRACKING    [role: student]

### Mark Lesson as Watched
```
PATCH /progress/courses/:courseId/lessons/:lessonId
Response: { "data": { "progress": { "percentage": 55, "completedLessons": [...] } } }
```

### Get Course Progress
```
GET /progress/courses/:courseId
Response: { "data": { "progress": { "percentage": 55, "completedLessons": [...], "completedExams": [...] } } }
```

### Get All Courses Progress Overview
```
GET /progress/overview
Response: { "data": { "overview": [{ "courseId": {...}, "percentage": 55 }] } }
```

---

## LESSONS    [admin/instructor: write | any authenticated: read]

### List Lessons
```
GET /courses/:courseId/lessons
```

### Create Lesson    [admin, instructor]
```
POST /courses/:courseId/lessons
Body:
{
  "title": "مقدمة في Python",
  "description": "...",
  "videoUrl": "https://storage.example.com/video.mp4",
  "duration": 1800,
  "order": 1,
  "isPublished": true
}
```

### Update Lesson    [admin, instructor]
```
PUT /courses/:courseId/lessons/:id
Body: (any fields to update)
```

### Delete Lesson    [admin, instructor]
```
DELETE /courses/:courseId/lessons/:id
```

---

## ASSIGNMENTS    [admin/instructor: manage | student: submit]

### List Assignments
```
GET /courses/:courseId/assignments
```

### Create Assignment    [admin, instructor]
```
POST /courses/:courseId/assignments
Body:
{
  "title": "واجب الفصل الأول",
  "description": "اكتب برنامج يحسب مجموع الأرقام",
  "submissionType": "any",   // "any" | "pdf" | "image" | "text"
  "dueDate": "2024-03-15T23:59:00Z",
  "maxScore": 100,
  "attachments": ["https://example.com/instructions.pdf"]
}
```

### Submit Assignment    [student]
```
POST /courses/:courseId/assignments/:id/submit
Body:
{
  "submissionType": "text",
  "textAnswer": "هذا هو حلي للواجب...",
  // OR for file:
  "submissionType": "pdf",
  "fileUrl": "https://storage.example.com/my-solution.pdf"
}
```

### Get Submissions (ordered: early → late → not submitted)    [admin, instructor]
```
GET /courses/:courseId/assignments/:id/submissions
Response:
{
  "data": {
    "assignment": { "title": "...", "dueDate": "..." },
    "early": [{ "student": {...}, "submittedAt": "...", "score": null, "submitted": true }],
    "late":  [{ ... }],
    "notSubmitted": [{ "student": {...}, "submitted": false }],
    "summary": { "total": 25, "earlyCount": 18, "lateCount": 4, "notSubmittedCount": 3 }
  }
}
```

### Grade Submission    [admin, instructor]
```
PATCH /courses/:courseId/assignments/:id/submissions/:submissionId/grade
Body: { "score": 85, "feedback": "عمل ممتاز، لكن يمكن تحسين..." }
```

---

## EXAMS    [admin/instructor: manage | student: take]

### List Exams
```
GET /courses/:courseId/exams
Each exam includes: { status: "active|upcoming|ended|draft" }
```

### Create Exam    [admin, instructor]
```
POST /courses/:courseId/exams
Body:
{
  "title": "اختبار الفصل الأول",
  "type": "quiz",
  "duration": 30,
  "passingScore": 60,
  "startTime": "2024-03-10T09:00:00Z",
  "endTime": "2024-03-10T11:00:00Z",
  "showGradesImmediately": true,
  "questions": [
    {
      "questionType": "mcq",
      "questionText": "ما هو ناتج 2 + 2؟",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "points": 2
    },
    {
      "questionType": "written",
      "questionText": "اشرح مفهوم الـ OOP بكلماتك",
      "points": 5
    }
  ]
}
```

### Get Exam Details (correct answers hidden for students)
```
GET /courses/:courseId/exams/:id
```

### Submit Exam    [student]
```
POST /courses/:courseId/exams/:id/submit
Body:
{
  "timeTaken": 1245,
  "answers": [
    { "mcqAnswer": 1 },
    { "writtenAnswer": "OOP هو نمط برمجي يعتمد على..." }
  ]
}
Response:
{
  "data": {
    "message": "تم تقديم الاختبار وتصحيحه تلقائياً",
    "score": 75,
    "gradeVisible": true
  }
}
```

### Get My Result    [student]
```
GET /courses/:courseId/exams/:id/my-result
Response (if manually modified):
{
  "data": { "result": { "score": 80, "isPassed": true, "gradeNote": "تم تعديل الدرجة من قبل المدرس" } }
}
```

### Get All Results (sorted: highest → lowest → not submitted)    [admin, instructor]
```
GET /courses/:courseId/exams/:id/results
Response:
{
  "data": {
    "submitted": [
      {
        "student": { "userId": { "firstName": "...", "email": "..." } },
        "score": 92,
        "isPassed": true,
        "isManuallyModified": false,
        "submitted": true
      }
    ],
    "notSubmitted": [{ "student": {...}, "submitted": false }],
    "submittedCount": 20,
    "total": 25
  }
}
```

### Grade Written Answers    [admin, instructor]
```
PATCH /courses/:courseId/exams/results/:resultId/grade-written
Body:
{
  "grades": [
    { "questionIndex": 1, "pointsEarned": 4 }
  ]
}
```

### Modify Score Manually    [admin, instructor]
```
PATCH /courses/:courseId/exams/results/:resultId/modify-score
Body: { "newScore": 85 }
Note: Sets isManuallyModified: true. Student will see "تم تعديل الدرجة من قبل المدرس"
```

### Release Grades    [admin, instructor]
```
POST /courses/:courseId/exams/:id/release-grades
Note: Makes all results visible to students at once.
```

---

## COMMUNITY

### General Community
```
GET  /community/posts?page=1&limit=10         Get all general posts
POST /community/posts                          Create post
     Body: { "content": "...", "attachments": [] }
DELETE /community/posts/:id                   Delete post
POST /community/posts/:id/like               Toggle like
POST /community/posts/:id/pin                Pin/unpin (admin/instructor only)
GET  /community/posts/:postId/comments       Get comments
POST /community/posts/:postId/comments       Add comment: { "content": "..." }
DELETE /community/posts/:postId/comments/:commentId   Delete comment
```

### Course Community (enrolled only)
```
GET  /community/courses/:courseId/posts
POST /community/courses/:courseId/posts
DELETE /community/courses/:courseId/posts/:id
POST /community/courses/:courseId/posts/:id/like
POST /community/courses/:courseId/posts/:id/pin
GET  /community/courses/:courseId/posts/:postId/comments
POST /community/courses/:courseId/posts/:postId/comments
DELETE /community/courses/:courseId/posts/:postId/comments/:commentId
```

---

## CHAT

### Get Conversations List
```
GET /chat
Response: { "data": { "conversations": [
  {
    "id": "...",
    "otherUser": { "firstName": "...", "role": "instructor" },
    "lastMessage": { "content": "مرحباً", "createdAt": "..." },
    "course": { "title": "Python Course" }
  }
] } }
```

### Start Conversation
```
POST /chat
Body: { "targetUserId": "...", "courseId": "..." }
```

### Get Messages
```
GET /chat/:conversationId/messages?page=1&limit=20
```

### Send Message (HTTP)
```
POST /chat/:conversationId/messages
Body: { "content": "مرحباً", "type": "text" }
```

### Socket.IO (Real-time)
```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "Bearer " + accessToken }
});
socket.emit("join_conversation", conversationId);
socket.emit("send_message", { conversationId, content: "Hello!" });
socket.on("new_message", (data) => { /* update chat UI */ });
socket.on("user_typing", ({ userId, name }) => { /* show typing */ });
socket.emit("typing", { conversationId });
```

---

## NOTIFICATIONS    [Protected]

```
GET    /notifications              Get my notifications
GET    /notifications?unread=true  Get unread only
PATCH  /notifications/read-all     Mark all as read
PATCH  /notifications/:id/read     Mark one as read
DELETE /notifications/:id          Delete notification
```

Notification types: `new_lesson | new_assignment | new_exam | post_reply | comment_reply | message | system`

---

## INSTRUCTOR ENDPOINTS    [role: instructor]

### Dashboard
```
GET /instructor/dashboard
Response:
{
  "data": {
    "instructor": { "userId": {...}, "bio": "...", "assignedCourses": [...] },
    "stats": {
      "totalCourses": 3,
      "totalStudents": 87,
      "finance": {
        "totalEarnedMET": 1500,
        "totalEarnedUSD": 3000,
        "reservedMET": 300,
        "reservedUSD": 600
      }
    }
  }
}
```

### Update Profile
```
PUT /instructor/profile
Body: { "bio": "...", "paypalAccount": "...", "phoneNumber": "..." }
```

### Financial Dashboard
```
GET /instructor/finance
Response includes: courseBreakdown[], recentTransactions[], summary{}
```

### Course Students List
```
GET /instructor/courses/:courseId/students?page=1
Response:
{
  "data": [
    {
      "student": {
        "userId": { "firstName": "...", "profileImage": "..." },
        "universityId": { "name": "..." }
      },
      "progress": { "percentage": 65 },
      "enrolledAt": "...",
      "previouslyKnown": true
    }
  ]
}
```

---

## ADMIN ENDPOINTS    [role: admin]

### Platform Statistics
```
GET /admin/stats
Response:
{
  "data": {
    "totalStudents": 450,
    "totalInstructors": 12,
    "totalCourses": 35,
    "totalUniversities": 5,
    "finance": {
      "totalIncomeMET": 45000,
      "totalIncomeUSD": 90000,
      "totalReservedMET": 9000,
      "netProfitMET": 36000,
      "netProfitUSD": 72000
    }
  }
}
```

### Create Instructor
```
POST /admin/instructors
Body:
{
  "firstName": "أحمد",
  "secondName": "محمد",
  "familyName": "السعيد",
  "email": "instructor@edu.com",
  "password": "securePass123",
  "nationalId": "123456789",
  "phoneNumber": "+966501234567",
  "paypalAccount": "instructor@paypal.com",
  "profileImage": "https://example.com/photo.jpg"
}
```

### Create Course
```
POST /admin/courses
Body:
{
  "title": "تعلم Python من الصفر",
  "description": "...",
  "instructorId": "64a1b2...",
  "allowedUniversities": ["64a1b2...", "64a1b3..."],
  "category": "programming",
  "level": "beginner",
  "metCost": 50,
  "instructorPercentage": 40,
  "reservedPercentage": 20
}
Note: metCost is in MET points. 50 MET = 100 USD.
```

### Add MET Points to Student
```
PATCH /admin/students/:id/met
Body: { "amount": 100, "description": "منحة تعليمية" }
```

### Release Instructor Payment
```
POST /admin/finance/instructors/:instructorId/release
Body: { "amount": 500, "note": "دفعة شهر مارس" }
```

### Cancel Reserved Amount
```
POST /admin/finance/instructors/:instructorId/cancel
Body: { "amount": 100, "note": "إلغاء لسبب..." }
```

---

## ERROR RESPONSES

All errors follow this format:
```json
{
  "status": "fail",
  "message": "رسالة الخطأ هنا",
  "errors": []
}
```

Common HTTP codes:
| Code | Meaning |
|------|---------|
| 400  | Bad Request — validation error or business logic violation |
| 401  | Unauthorized — missing or invalid token |
| 403  | Forbidden — correct token but insufficient permissions |
| 404  | Not Found |
| 409  | Conflict — duplicate (email, enrollment, exam submission) |
| 500  | Server Error |

---

## POSTMAN SETUP

1. Create collection `Edu Platform`
2. Set collection variable `baseUrl = http://localhost:5000/api/v1`
3. After login, set collection variable `token = {{response.data.accessToken}}`
4. All requests: `Authorization: Bearer {{token}}`
5. Login: `POST {{baseUrl}}/auth/login`
   ```json
   { "email": "admin1@edu.com", "password": "123456789" }
   ```

---

*Last updated: Full system including MET points, quiz timing, and financial module*