# BACKEND EXPLANATION & SYSTEM ARCHITECTURE GUIDE
## Arabic Educational Platform — منصة التعليم العربية
### Technical Documentation for Graduation Project

---

> **Purpose of this document**  
> This file is a complete technical guide for the backend of the Arabic Educational Platform. It is written for:
> - Team members who want to understand how the system works
> - University professors evaluating the engineering decisions
> - Future developers who will maintain or extend this system
> - Anyone who wants to understand real-world backend architecture

---

# PART 1 — OVERALL BACKEND ARCHITECTURE

## 1.1 What Architecture Did We Choose?

We chose a **Modular Monolith** architecture with a clear **Service Layer pattern**.

```
Client (Postman / React / Mobile)
         │
         ▼
   HTTP Request
         │
         ▼
   Express Router ──► Middleware Stack ──► Controller ──► Service ──► Model ──► MongoDB
         │                                     │                         │
         │                              Sends Response          Business Logic Lives Here
         │
   Socket.IO (future real-time chat)
```

**Why Modular Monolith and not Microservices?**

A microservices architecture splits the app into many independent services (auth service, course service, etc.), each with its own database. This sounds attractive but is overkill for a graduation project or an early-stage product because:
- It requires Docker, Kubernetes, message queues (Kafka/RabbitMQ), and service discovery
- Debugging across services is much harder
- Network latency between services adds complexity

A **Modular Monolith** gives us the clean separation of microservices (each module is independent) while keeping everything in one deployable unit that is simple to develop, test, and run.

**We can migrate to microservices later** by simply extracting each module into its own service — the boundaries are already well-defined.

---

## 1.2 The Three Core Principles

**1. Separation of Concerns**  
Every file has one job:
- Routes: define URL paths and apply middleware
- Controllers: handle HTTP request/response
- Services: contain all business logic
- Models: define data structure

**2. Don't Repeat Yourself (DRY)**  
Shared utilities like `asyncHandler`, `ApiError`, `ApiResponse`, `notificationHelper`, and `pagination` are written once and used everywhere.

**3. Single Source of Truth**  
All error formatting goes through one `errorHandler`. All success responses use `ApiResponse`. This means the frontend always receives predictable, consistent JSON.

---

# PART 2 — FOLDER STRUCTURE EXPLAINED

```
edu-platform/
│
├── server.js              ← Entry point. Starts HTTP + Socket.IO server
├── .env                   ← Environment variables (NEVER commit to git)
├── .env.example           ← Template showing what env vars are needed
│
├── src/
│   ├── config/
│   │   ├── db.js          ← MongoDB connection logic
│   │   ├── constants.js   ← Shared enums (ROLES, NOTIFICATION_TYPES...)
│   │   └── seed.js        ← Creates initial admin accounts + sample universities
│   │
│   ├── modules/           ← THE HEART OF THE APPLICATION
│   │   ├── auth/          ← Registration, login, JWT, password change
│   │   ├── users/         ← Shared User model (all roles)
│   │   ├── admin/         ← Admin-only CRUD operations
│   │   ├── students/      ← Student dashboard, enrollment, course browsing
│   │   ├── instructors/   ← Instructor dashboard, course management
│   │   ├── universities/  ← University CRUD + public listing
│   │   ├── courses/       ← Course model
│   │   ├── enrollments/   ← Student ↔ Course relationship
│   │   ├── lessons/       ← Video lessons CRUD
│   │   ├── assignments/   ← Assignments + student submissions + grading
│   │   ├── exams/         ← Quizzes/exams + auto-grading
│   │   ├── progress/      ← Per-student, per-course progress tracking
│   │   ├── community/     ← Posts + comments (general + per-course)
│   │   ├── chat/          ← Conversations + messages
│   │   ├── notifications/ ← Notification storage + retrieval
│   │   └── finance/       ← Reserved for future financial features
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js       ← Verify JWT, load user
│   │   ├── role.middleware.js       ← Check user role (RBAC)
│   │   ├── validate.middleware.js   ← Run Joi schema validation
│   │   ├── error.middleware.js      ← Global error handler + 404
│   │   └── rateLimiter.middleware.js← Prevent brute force / spam
│   │
│   ├── utils/
│   │   ├── ApiError.js           ← Custom error class with status code
│   │   ├── ApiResponse.js        ← Standardized success responses
│   │   ├── asyncHandler.js       ← Wrap async functions, auto-catch errors
│   │   ├── generateToken.js      ← Create & verify JWT tokens
│   │   ├── hashData.js           ← AES-256 encrypt/decrypt sensitive data
│   │   ├── notificationHelper.js ← Create notifications for users/courses
│   │   └── pagination.js         ← Reusable pagination logic
│   │
│   ├── socket/
│   │   └── socket.js    ← Socket.IO real-time chat setup
│   │
│   ├── routes/
│   │   └── index.js     ← Central router: imports and mounts all module routes
│   │
│   └── app.js           ← Express setup: middleware stack, routes, error handlers
```

### Why This Structure?

When a new developer joins, they don't need to understand the whole system. They open `src/modules/courses/` and find everything about courses in one place. This is called **feature-based folder organization** and it scales much better than layer-based organization as the project grows.

---

# PART 3 — EACH LAYER EXPLAINED

## 3.1 Routes Layer

**File example:** `src/modules/admin/admin.routes.js`

```javascript
router.post("/instructors", protect, authorize("admin"), validate(schema), ctrl.createInstructor);
```

The route file does FOUR things in sequence:
1. `protect` — verify the user is logged in (JWT check)
2. `authorize("admin")` — verify the user has the correct role
3. `validate(schema)` — validate request body using Joi
4. `ctrl.createInstructor` — call the controller function

**Routes are kept thin** — they contain no logic, only the pipeline.

## 3.2 Controller Layer

**File example:** `src/modules/admin/admin.controller.js`

```javascript
const createInstructor = asyncHandler(async (req, res) => {
  const data = await service.createInstructor(req.body, req.user._id);
  return ApiResponse.success(res, 201, "تم إنشاء حساب المدرس بنجاح", data);
});
```

The controller's only job is:
1. Extract data from the request (`req.body`, `req.params`, `req.user`)
2. Pass it to the service
3. Send the response back

**Controllers contain NO business logic** — they don't touch the database directly.

**Why separate controllers from routes?**  
Because controllers can be called from multiple places (HTTP routes, Socket.IO events, scheduled jobs) without duplicating code.

## 3.3 Service Layer

**File example:** `src/modules/auth/auth.service.js`

The service layer is where all **business logic** lives:
- Checking if an email already exists before registration
- Verifying that a student's university is active before enrollment
- Calculating exam scores automatically
- Filtering courses based on university membership

**Why a separate service layer?**

Because if we put the logic directly in the controller, we cannot:
- Unit test the logic without starting an HTTP server
- Reuse the same logic from Socket.IO or a CRON job
- Easily understand what the system actually does

The service layer is the most important layer for long-term maintainability.

## 3.4 Model Layer (Mongoose Schemas)

**File example:** `src/modules/users/user.model.js`

Models define the shape of data in MongoDB and enforce constraints at the database level.

**Key decisions:**

```javascript
password: { type: String, select: false }
```
`select: false` means password is NEVER returned in any query unless explicitly requested with `.select("+password")`. This prevents accidental password exposure in API responses.

```javascript
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```
This pre-save hook automatically hashes the password before it is stored. The developer never needs to remember to hash manually — the model enforces it automatically. Cost factor 12 = 2^12 = 4096 hashing rounds, making brute-force attacks impractically slow.

---

# PART 4 — DATABASE DESIGN

## 4.1 Why MongoDB?

MongoDB was chosen because:
- **Flexible schema**: educational content varies greatly — some courses have quizzes, some don't; some lessons have files, some are video-only
- **Document model**: a course document naturally contains arrays of allowed universities, which maps perfectly to MongoDB's document structure
- **Horizontal scaling**: MongoDB shards easily across multiple servers when the platform grows
- **JSON-native**: works naturally with JavaScript/Node.js without ORM translation overhead

## 4.2 Collections Overview

### `users` — The Central Identity Collection

Every person on the platform (student, instructor, admin) has ONE document in `users`.

```
users
 ├── _id
 ├── firstName, secondName, familyName
 ├── email (unique, indexed)
 ├── password (hashed, select: false)
 ├── role: "student" | "instructor" | "admin"
 ├── profileImage
 ├── isActive (soft disable without deleting)
 ├── isVerified
 ├── refreshToken (select: false)
 └── lastLoginAt
```

**Why one collection for all roles?**

Because login is role-agnostic — the system receives an email and password and returns a JWT. If we had separate `students_users` and `instructors_users` collections, login would need to query two collections.

**Why `isActive` instead of deleting users?**

Deleting a user would cascade into many other collections (enrollments, submissions, messages...). Instead we "soft-delete" by setting `isActive: false`. The user cannot log in but their historical data is preserved.

### `students` — Student-Specific Data

```
students
 ├── userId → ref: users (1:1)
 ├── universityId → ref: universities
 ├── enrolledCourses → [ref: courses]
 └── discount: { type, value, appliedBy, appliedAt }
```

**Why a separate `students` collection?**

The `users` collection stores identity (email, password, role). Student-specific data like university affiliation and enrolled courses don't belong there. Keeping them separate means:
- The `users` collection stays small and fast for login lookups
- Student data can grow independently

### `instructors` — Instructor-Specific Data

```
instructors
 ├── userId → ref: users (1:1)
 ├── nationalId (encrypted, select: false)
 ├── phoneNumber, dateOfBirth, paypalAccount
 ├── bio
 ├── assignedCourses → [ref: courses]
 └── createdBy → ref: users (the admin who created this account)
```

**Why is nationalId encrypted?**

The national ID is Personally Identifiable Information (PII) subject to data protection laws. It is encrypted at rest using AES-256-CBC. Even if the database is compromised, the national IDs cannot be read without the encryption key. It is also marked `select: false` so it is never accidentally included in API responses.

**Why is `createdBy` stored?**

For audit trail purposes. In a real production system, knowing which admin created an instructor account is important for accountability.

### `universities` — University Registry

```
universities
 ├── name (unique, text-indexed)
 ├── nameEn
 ├── logo, city
 ├── isActive
 └── createdBy → ref: users
```

This collection is the **single source of truth** for which universities are recognized by the platform. Students CANNOT enter a university name manually — they must select from this list. This ensures the course-university filtering system works correctly.

### `courses` — Course Catalog

```
courses
 ├── title, description, thumbnail, slug (unique)
 ├── instructorId → ref: instructors
 ├── allowedUniversities → [ref: universities]  ← KEY FIELD
 ├── category, level
 ├── isPublished
 ├── totalLessons (cached count)
 ├── instructorPercentage, reservedPercentage
 ├── price, totalIncome, enrolledCount
 └── createdBy → ref: users
```

**The most important field: `allowedUniversities`**

This array is the foundation of the course-university access control system. When a student queries available courses, the backend filters:

```javascript
Course.find({
  isPublished: true,
  allowedUniversities: student.universityId  // MongoDB matches if universityId is IN the array
})
```

This single query ensures students from University A never see courses meant only for University B.

**Why cache `totalLessons` and `enrolledCount`?**

Instead of counting documents in the `lessons` collection every time someone loads the course list, we maintain these counters in the `courses` document and increment/decrement them when lessons are added or students enroll. This trades a small amount of write complexity for a significant read performance improvement.

### `enrollments` — Student-Course Relationship

```
enrollments
 ├── studentId → ref: students
 ├── courseId  → ref: courses
 ├── status: "active" | "completed" | "dropped"
 ├── enrolledAt
 └── completedAt
```

**Why a separate `enrollments` collection?**

We could store enrolled courses as an array inside the `students` document. However:
- We need per-enrollment metadata (status, dates)
- Querying "all students enrolled in course X" becomes a collection scan if stored inside each student document
- With a separate collection, `Enrollment.find({ courseId: X })` is a direct index lookup

**Compound unique index:** `{ studentId: 1, courseId: 1 }` prevents a student from enrolling twice and makes enrollment checks instant.

### `progress` — Learning Progress Tracking

```
progress
 ├── studentId → ref: students
 ├── courseId  → ref: courses
 ├── completedLessons    → [ref: lessons]
 ├── completedAssignments → [ref: assignments]
 ├── completedExams      → [ref: exams]
 ├── percentage (0-100, auto-calculated)
 └── lastAccessedAt
```

**How is percentage calculated?**

```javascript
const totalItems = totalLessons + totalAssignments + totalExams;
const completedItems = completedLessons.length + completedAssignments.length + completedExams.length;
percentage = Math.round((completedItems / totalItems) * 100);
```

When percentage reaches 100, the enrollment status automatically changes to "completed".

### `posts` and `comments` — Community System

```
posts
 ├── authorId → ref: users
 ├── courseId → ref: courses (null = general community)  ← KEY DESIGN
 ├── content, attachments
 ├── likes → [ref: users]
 ├── isDeleted (soft delete)
 └── isPinned
```

**Why one `posts` collection for both communities?**

The general community and course communities are structurally identical — both have posts, comments, and likes. The only difference is context: `courseId: null` means general community, `courseId: ObjectId` means course community.

This avoids code duplication. The same API endpoints serve both communities simply by passing or omitting `courseId`.

### `conversations` and `messages` — Chat System

```
conversations
 ├── participants → [ref: users] (exactly 2 for direct chat)
 ├── courseId → ref: courses (optional context)
 ├── lastMessage → ref: messages
 └── lastMessageAt

messages
 ├── conversationId → ref: conversations (indexed)
 ├── senderId → ref: users
 ├── content, type, fileUrl
 └── isRead
```

**Why separate conversations from messages?**

If messages were embedded in conversation documents, a conversation with 1000 messages would be a 1MB+ document — impossible to load efficiently. The separate collection lets us:
- Load conversation metadata (sidebar list) without loading any messages
- Paginate message history efficiently
- Use indexes on `{ conversationId: 1, createdAt: -1 }` for fast history retrieval

### `notifications`

```
notifications
 ├── userId → ref: users (indexed)
 ├── type: "new_lesson" | "new_assignment" | "new_exam" | etc.
 ├── title, body
 ├── relatedId → ObjectId (the course/lesson/post being referenced)
 ├── relatedType → "Course" | "Lesson" | "Post" etc.
 └── isRead
```

**Why store `relatedId` and `relatedType`?**

The frontend can use these fields for **deep linking** — clicking a notification takes the user directly to the relevant lesson, assignment, or post. Without these fields, notifications are just text with no action.

**Compound index:** `{ userId: 1, isRead: 1, createdAt: -1 }` serves the most common query pattern: "get all unread notifications for user X, newest first."

---

# PART 5 — AUTHENTICATION & AUTHORIZATION

## 5.1 Why JWT (JSON Web Token)?

**Alternative 1: Session-based auth**  
The server stores session data in memory or Redis. Every request queries the session store. Problems:
- Doesn't scale horizontally without shared session storage
- Stateful — server must maintain session data

**Alternative 2: JWT (what we use)**  
The server issues a signed token containing the user's ID and role. The client stores it and sends it with every request. The server verifies the signature without touching the database.

Benefits:
- Stateless — any server can verify any token
- Contains the user's role so role checks don't need a DB query
- Works naturally across mobile apps, web apps, and Postman

## 5.2 Access Token + Refresh Token Strategy

We use two tokens:

**Access Token**
- Short-lived: 7 days
- Sent in every API request: `Authorization: Bearer <token>`
- Signed with `JWT_SECRET`

**Refresh Token**  
- Long-lived: 30 days
- Stored in two places: database (for revocation) and httpOnly cookie (for security)
- Used ONLY to get a new access token when the old one expires

```
Login → [access_token (7d), refresh_token (30d stored in DB)]
       │
       ▼
Normal requests → use access_token
       │
       ▼
Access token expires → POST /auth/refresh-token with refresh_token cookie
       │                → server validates against DB stored token
       ▼
       New access_token issued
```

**Why store refresh token in DB?**

If we don't store it, we cannot invalidate it. If a user is compromised, we can clear their `refreshToken` field and they are immediately logged out on all devices.

## 5.3 Role-Based Access Control (RBAC)

Three roles: `student`, `instructor`, `admin`

Implemented in two middleware layers:

**Layer 1 — Authentication (who are you?):**
```javascript
// auth.middleware.js
const protect = async (req, res, next) => {
  // 1. Extract token from Authorization header
  // 2. Verify JWT signature
  // 3. Load user from DB
  // 4. Attach user to req.user
  // 5. Check isActive flag
};
```

**Layer 2 — Authorization (what can you do?):**
```javascript
// role.middleware.js
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, "لا تملك صلاحية الوصول"));
  }
  next();
};
```

**Usage in routes:**
```javascript
// Only admin can create courses
router.post("/courses", protect, authorize("admin"), ctrl.createCourse);

// Admin and instructor can add lessons
router.post("/lessons", protect, authorize("admin", "instructor"), ctrl.createLesson);

// All authenticated users can read notifications
router.get("/notifications", protect, ctrl.getNotifications);
```

---

# PART 6 — STUDENT SYSTEM

## 6.1 Registration Flow

```
POST /api/v1/auth/register
  │
  ├── Joi validation (name, email, password, confirmPassword, universityId)
  │
  ├── Check email uniqueness in users collection
  │
  ├── Verify university exists AND isActive: true
  │     (prevents random university names, ensures only admin-approved universities)
  │
  ├── Create User document (role: "student")
  │     └── Password auto-hashed by pre-save hook
  │
  └── Create Student document linked to userId + universityId
```

**Why must university come from the database?**

If students could type any university name, the course-university filtering system would break. Every course has `allowedUniversities: [ObjectId, ...]`. The filter `allowedUniversities: student.universityId` only works if universityId is the exact same ObjectId stored in the course. A free-text "King Saud University" would never match the database ObjectId.

## 6.2 University Filtering Logic

This is the most critical business logic in the student system:

```javascript
// student.service.js — getAvailableCourses()

const student = await Student.findOne({ userId });

const filter = {
  isPublished: true,
  allowedUniversities: student.universityId,  // ← MongoDB checks if this ObjectId is IN the array
};

const courses = await Course.find(filter);
```

MongoDB's behavior: when you filter with `allowedUniversities: someObjectId`, MongoDB returns documents where `someObjectId` appears anywhere in the `allowedUniversities` array. This is a built-in array membership check.

## 6.3 Course Enrollment Logic

```
POST /api/v1/student/courses/:courseId/enroll
  │
  ├── Find student record
  │
  ├── Verify course exists AND isPublished: true AND university is allowed
  │     (double-check — student shouldn't be able to enroll in hidden courses)
  │
  ├── Check no existing enrollment (prevent duplicates via unique compound index)
  │
  ├── Create Enrollment record { studentId, courseId, status: "active" }
  │
  ├── Create Progress record { studentId, courseId, percentage: 0 }
  │
  ├── Add courseId to student.enrolledCourses array
  │
  └── Increment course.enrolledCount by 1
```

---

# PART 7 — INSTRUCTOR SYSTEM

## 7.1 Instructor Creation by Admin Only

Instructors NEVER self-register. This is a deliberate security decision:
- Prevents unauthorized people from gaining instructor-level permissions
- Admin verifies identity via national ID before creating the account
- Admin sets the initial password; instructor changes it on first login

```
POST /api/v1/admin/instructors
  │
  ├── Admin provides: name, email, password, nationalId, paypalAccount
  │
  ├── nationalId is encrypted with AES-256-CBC before storage
  │     (even a DB breach cannot expose national IDs)
  │
  ├── Create User { role: "instructor", isVerified: true }
  │
  └── Create Instructor { userId, nationalId (encrypted), createdBy: adminId }
```

## 7.2 Instructor Course Permissions

An instructor can only manage content for courses explicitly assigned to them by admin:

```javascript
// From lesson.service.js — verifyCoursePermission()

const instructor = await Instructor.findOne({ userId });
const isAssigned = instructor.assignedCourses.some(
  (id) => id.toString() === courseId.toString()
);
if (!isAssigned) throw new ApiError(403, "هذا الكورس غير مسند إليك");
```

This check is performed in every lesson, assignment, and exam service function before any write operation.

---

# PART 8 — COURSE SYSTEM

## 8.1 Content Structure

Each course contains:
```
Course
 ├── Lessons (videos, ordered)
 ├── Assignments (submissions + grading)
 ├── Exams (auto-graded multiple choice)
 ├── Community (posts + comments, private to enrolled students)
 └── Progress (per-student tracking)
```

## 8.2 Lesson Flow

```
POST /api/v1/courses/:courseId/lessons
  │
  ├── Verify permission (admin or assigned instructor)
  ├── Auto-assign order number (last order + 1)
  ├── Create Lesson document
  ├── Increment course.totalLessons
  └── Notify all enrolled students via notifyCourseStudents()
```

## 8.3 Exam Auto-Grading

```javascript
// exam.service.js — submitExam()

exam.questions.forEach((question, idx) => {
  if (answers[idx] === question.correctAnswer) {
    totalScore += question.points;
  }
});

const percentage = Math.round((totalScore / totalPossible) * 100);
const isPassed   = percentage >= exam.passingScore;
```

Students never see `correctAnswer` in the question data (it is stripped server-side before sending the exam). After submission, the correct answers are returned along with the score.

## 8.4 Progress Tracking

Progress is recalculated every time a student completes a lesson, assignment, or exam:

```javascript
const totalItems     = totalLessons + totalAssignments + totalExams;
const completedItems = completedLessons.length + completedAssignments.length + completedExams.length;
progress.percentage  = Math.round((completedItems / totalItems) * 100);
```

When `percentage === 100`, the enrollment status changes to `"completed"` automatically.

---

# PART 9 — COMMUNITY SYSTEM

## 9.1 Two Communities, One Codebase

**General Community**: All platform users can post. `courseId: null`  
**Course Community**: Only enrolled students + instructor + admin. `courseId: ObjectId`

Both are served by the same endpoints with one difference: course community endpoints include `courseId` in the URL.

**Enrollment check for course community:**
```javascript
if (courseId) {
  const enrollment = await Enrollment.findOne({ studentId: student._id, courseId, status: "active" });
  if (!enrollment) throw new ApiError(403, "يجب التسجيل في الكورس أولاً");
}
```

## 9.2 Moderation

Posts and comments support soft deletion (`isDeleted: true`). The rule is:
- Post author can delete their own post
- Instructor and Admin can delete any post in their courses
- Deleted posts are hidden from queries but not removed from DB (preserves thread integrity)

## 9.3 Notifications on Comment

When someone comments on a post, the post author receives a notification:
```javascript
if (post.authorId.toString() !== authorId.toString()) {
  await notifyUser(post.authorId, "post_reply", "تعليق جديد", "...", post._id, "Post");
}
```

---

# PART 10 — NOTIFICATION SYSTEM

## 10.1 How Notifications Are Generated

Notifications are created from multiple places in the codebase using the `notificationHelper` utility:

| Event | Trigger Location | Recipients |
|-------|-----------------|-----------|
| New lesson uploaded | `lesson.service.js` | All enrolled students |
| New assignment added | `assignment.service.js` | All enrolled students |
| New exam added | `exam.service.js` | All enrolled students |
| Comment on post | `community.service.js` | Post author only |
| Admin broadcast | `admin.service.js` | All active users |

## 10.2 Notification Architecture

```javascript
// notificationHelper.js

const notifyCourseStudents = async (courseId, type, title, body) => {
  // 1. Find all active enrollments for this course
  const enrollments = await Enrollment.find({ courseId, status: "active" });
  
  // 2. Build notification objects for each enrolled student
  const notifications = enrollments.map(e => ({
    userId: e.studentId.userId,  // The User._id, not Student._id
    type, title, body,
    relatedId: courseId,
    relatedType: "Course"
  }));
  
  // 3. Insert all at once (bulk insert = efficient)
  await Notification.insertMany(notifications);
};
```

**Why `insertMany` instead of a loop?**

A loop would make N database round-trips for N students. `insertMany` makes ONE round-trip regardless of how many students are enrolled. This is critical for popular courses with hundreds of students.

---

# PART 11 — CHAT SYSTEM

## 11.1 REST API (Current)

The chat system currently uses REST API for all operations. This works for:
- Loading conversation list on page open
- Loading message history
- Sending messages (with page refresh / polling)

## 11.2 Socket.IO (Future Real-Time)

The `src/socket/socket.js` file is already written and ready to enable real-time chat. It:

1. **Authenticates** socket connections via JWT in the handshake
2. **Rooms**: each conversation has a room `conv:{conversationId}`
3. **Events**: `join_conversation`, `leave_conversation`, `send_message`, `typing`

```javascript
// Future usage from frontend:
const socket = io("http://localhost:5000", {
  auth: { token: "Bearer " + accessToken }
});

socket.emit("join_conversation", conversationId);
socket.on("new_message", (data) => { /* update UI */ });
socket.emit("send_message", { conversationId, content: "Hello!" });
```

The Socket.IO `sendMessage` event calls the same `chat.service.sendMessage()` function as the REST API, so message storage is consistent regardless of transport method.

---

# PART 12 — ERROR HANDLING

## 12.1 Why Centralized Error Handling?

Without centralization, every function would need:
```javascript
try {
  // ... logic
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

This leads to:
- Inconsistent error response formats
- Forgetting to handle errors in some routes
- No handling for Mongoose-specific errors

With our approach, we throw errors anywhere and they bubble up to the global handler:

```javascript
throw new ApiError(404, "المدرس غير موجود");
// This travels to error.middleware.js automatically
```

## 12.2 The Error Pipeline

```
Business Logic throws: throw new ApiError(404, "not found")
         │
         ▼
asyncHandler catches it and calls next(error)
         │
         ▼
error.middleware.js receives it
         │
         ├── Is it a Mongoose CastError? → "Invalid ObjectId" (400)
         ├── Is it a Duplicate Key error? → "Already exists" (409)
         ├── Is it a JWT error? → "Invalid token" (401)
         └── Is it our ApiError? → Use its statusCode and message
         │
         ▼
Consistent JSON response:
{
  "status": "fail",
  "message": "المدرس غير موجود",
  "errors": []
}
```

## 12.3 Why `asyncHandler`?

Express only catches synchronous errors automatically. For async functions, without `asyncHandler`:

```javascript
// This will crash the server if await throws!
router.get("/courses", async (req, res) => {
  const courses = await Course.find(); // What if DB is down?
  res.json(courses);
});
```

With `asyncHandler`:
```javascript
// Any thrown error is automatically passed to next()
router.get("/courses", asyncHandler(async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
}));
```

---

# PART 13 — SECURITY DECISIONS

| Security Layer | Package | Why |
|---------------|---------|-----|
| HTTP Security Headers | `helmet` | Sets headers like `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` to prevent common web attacks |
| Rate Limiting | `express-rate-limit` | Login: max 10 attempts per 15 min. General: max 200 per 10 min. Prevents brute force and DoS |
| NoSQL Injection | `express-mongo-sanitize` | Strips `$` and `.` from user input, preventing MongoDB operator injection like `{ "$gt": "" }` |
| Password Hashing | `bcryptjs` (cost 12) | One-way hash. Even if DB is stolen, passwords cannot be recovered |
| Sensitive Data Encryption | `crypto` AES-256-CBC | National IDs encrypted at rest. Two-way (can decrypt for legitimate use) unlike password hashing |
| JWT Security | `select: false` on refreshToken | Refresh tokens never appear in normal queries |
| CORS | `cors` package | Configures which origins can call the API |
| Cookie Security | `httpOnly: true, secure: true` | Refresh token cookie cannot be accessed by JavaScript (XSS protection) |

---

# PART 14 — SCALABILITY ROADMAP

## 14.1 Scaling the Current System

The current architecture supports horizontal scaling because:
- **Stateless JWT auth**: any server instance can handle any request
- **MongoDB Atlas**: cloud-managed, auto-scalable database
- **No shared server-side state**: no sessions stored in memory

## 14.2 Real-Time Chat at Scale

Currently: REST API (polling)  
Phase 2: Socket.IO on the same server (already implemented)  
Phase 3 (at scale): Redis Pub/Sub adapter for Socket.IO across multiple servers

```javascript
// Future addition (one line):
const { createAdapter } = require("@socket.io/redis-adapter");
io.adapter(createAdapter(pubClient, subClient));
```

## 14.3 Financial System Expansion

The data model already supports financial tracking:
- `course.instructorPercentage` — instructor's share
- `course.reservedPercentage` — platform-held amount
- `course.totalIncome` — total revenue per course

Future additions:
- `transactions` collection for payment history
- Integration with Saudi payment gateways: **Moyasar** or **HyperPay**
- PayPal API integration (instructor `paypalAccount` field is already stored)
- Automated payout scheduling with CRON jobs

## 14.4 Video Delivery at Scale

Currently: `videoUrl` field stores an external URL  
Future: Upload to **AWS S3** or **Cloudflare R2**, generate signed URLs for access control

---

# PART 15 — API QUICK REFERENCE (Postman Guide)

## Setup

All protected routes require:
```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

## Auth Endpoints

| Method | URL | Body | Access |
|--------|-----|------|--------|
| POST | `/api/v1/auth/register` | `{firstName, secondName, familyName, email, password, confirmPassword, universityId}` | Public |
| POST | `/api/v1/auth/login` | `{email, password}` | Public |
| POST | `/api/v1/auth/logout` | — | Any logged-in |
| POST | `/api/v1/auth/refresh-token` | `{refreshToken}` | Public |
| POST | `/api/v1/auth/change-password` | `{currentPassword, newPassword, confirmNewPassword}` | Any logged-in |
| GET  | `/api/v1/auth/me` | — | Any logged-in |

## Admin Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/admin/stats` | Platform statistics |
| POST | `/api/v1/admin/universities` | Create university |
| GET | `/api/v1/admin/universities` | List universities |
| POST | `/api/v1/admin/instructors` | Create instructor account |
| GET | `/api/v1/admin/instructors` | List instructors (`?search=name`) |
| POST | `/api/v1/admin/courses` | Create course |
| GET | `/api/v1/admin/courses` | List courses |
| PATCH | `/api/v1/admin/courses/:id/assign-instructor` | Assign instructor |
| GET | `/api/v1/admin/students` | List students (`?email=x&name=y&universityId=z`) |
| PATCH | `/api/v1/admin/students/:id/discount` | Apply discount |
| GET | `/api/v1/admin/finance/payments` | Instructor dues |
| POST | `/api/v1/admin/notifications/broadcast` | Send to all users |

## Student Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/student/dashboard` | Dashboard with enrolled courses + progress |
| GET | `/api/v1/student/courses/available` | Courses for student's university |
| POST | `/api/v1/student/courses/:courseId/enroll` | Enroll in course |
| DELETE | `/api/v1/student/courses/:courseId/drop` | Drop course |
| GET | `/api/v1/student/courses/:courseId/content` | Full course content |

## Course Content Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/courses/:courseId/lessons` | List lessons |
| POST | `/api/v1/courses/:courseId/lessons` | Add lesson (instructor/admin) |
| GET | `/api/v1/courses/:courseId/assignments` | List assignments |
| POST | `/api/v1/courses/:courseId/assignments/:id/submit` | Submit assignment (student) |
| GET | `/api/v1/courses/:courseId/exams` | List exams |
| POST | `/api/v1/courses/:courseId/exams/:id/submit` | Submit exam (student) |

## Community Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/community/posts` | General community posts |
| POST | `/api/v1/community/posts` | Create post |
| GET | `/api/v1/community/courses/:courseId/posts` | Course community posts |
| POST | `/api/v1/community/posts/:id/like` | Like/unlike post |
| POST | `/api/v1/community/posts/:postId/comments` | Add comment |

## Other Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/notifications` | My notifications |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/chat` | My conversations |
| POST | `/api/v1/chat` | Start conversation |
| GET | `/api/v1/chat/:id/messages` | Get messages |
| POST | `/api/v1/chat/:id/messages` | Send message |

---

# PART 16 — SETUP & RUNNING INSTRUCTIONS

## Step 1: Install Dependencies

```bash
npm install express mongoose dotenv bcryptjs jsonwebtoken helmet cors \
  express-rate-limit express-mongo-sanitize joi morgan \
  slugify express-async-errors cookie-parser multer socket.io
  
npm install -D nodemon
```

## Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and secret keys
```

## Step 3: Seed Initial Data

```bash
npm run seed
# Creates 3 admin accounts + 5 sample universities
```

**Admin Credentials after seed:**
```
admin1@edu.com  / 123456789
admin2@edu.com  / 123456789
admin3@edu.com  / 123456789
```

## Step 4: Run the Server

```bash
npm run dev    # Development (with nodemon auto-restart)
npm start      # Production
```

## Step 5: Test with Postman

1. `POST /api/v1/auth/login` with admin credentials → copy `accessToken`
2. Set `Authorization: Bearer <token>` in Postman collection header
3. `GET /api/v1/admin/stats` → should return platform statistics
4. `GET /api/v1/universities` → should return the seeded universities
5. Register a student with one of the university IDs

---

*Documentation last updated: Full System — Phases 1 through 8*  
*Architecture: Modular Monolith + Service Layer + REST API + Socket.IO*  
*Stack: Node.js + Express + MongoDB + Mongoose + JWT*
