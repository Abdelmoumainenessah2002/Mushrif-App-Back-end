# Mushrif (مشرف) — Backend API

**Mushrif** is an enterprise-grade, multi-tenant work, project, and team management backend platform built on Node.js and Express.js. Designed for high scalability, real-time collaboration, and internationalization, the system leverages MongoDB for data persistence, Redis for distributed session management, atomic rate limiting, and caching, and BullMQ for asynchronous background job execution.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Technology Stack](#-technology-stack)
- [System Architecture & Core Subsystems](#-system-architecture--core-subsystems)
  - [1. Authentication & Session Architecture](#1-authentication--session-architecture)
  - [2. Redis Infrastructure & Distributed Operations](#2-redis-infrastructure--distributed-operations)
  - [3. Asynchronous Task Queues & Workers](#3-asynchronous-task-queues--workers)
  - [4. Rate Limiting Subsystem](#4-rate-limiting-subsystem)
  - [5. Internationalization (i18n) & Dynamic Messaging](#5-internationalization-i18n--dynamic-messaging)
  - [6. Work & Organization Management Domain](#6-work--organization-management-domain)
  - [7. Cloud Storage & Media Uploads](#7-cloud-storage--media-uploads)
- [API Route Reference](#-api-route-reference)
  - [Authentication (`/api/auth`)](#authentication-apiauth)
  - [Password Management (`/api/password`)](#password-management-apipassword)
  - [Email Verification & Updates (`/api/emails`)](#email-verification--updates-apiemails)
  - [User Management (`/api/users`)](#user-management-apiusers)
  - [Administration & Moderation (`/api/admin`)](#administration--moderation-apiadmin)
  - [Organization & Work Domain (`/api/work/organizations`)](#organization--work-domain-apiworkorganizations)
- [Database Models & Domain Schema](#-database-models--domain-schema)
- [Environment Configuration](#-environment-configuration)
- [Getting Started & Operational Commands](#-getting-started--operational-commands)
- [Codebase Audit & Technical Observations](#-codebase-audit--technical-observations)
- [License & Authors](#-license--authors)

---

## 🏛 Architectural Overview

```
                           +------------------------+
                           |  Client Applications   |
                           | (Web, Mobile, Postman) |
                           +-----------+------------+
                                       |
                                HTTP / HTTPS
                                       |
                     +-----------------v-----------------+
                     |    Express.js 5 Application       |
                     |  (Trust Proxy, CORS, Cookies,     |
                     |   i18n Lang Extraction)           |
                     +-----------------+-----------------+
                                       |
               +-----------------------+-----------------------+
               |                       |                       |
     +---------v---------+   +---------v---------+   +---------v---------+
     |   Rate Limiters   |   | Token & Session   |   | File Uploads      |
     | (Redis Lua Script |   | Middleware        |   | (Multer Memory    |
     | + Memory Fallback)|   | (Redis Session ID)|   |  -> Cloudinary)   |
     +---------+---------+   +---------+---------+   +-------------------+
               |                       |
               +-----------+-----------+
                           |
                     +-----v-----+
                     | Controllers
                     +-----+-----+
                           |
             +-------------+-------------+
             |                           |
   +---------v---------+       +---------v---------+
   |   MongoDB via     |       |   BullMQ Queues   |
   |   Mongoose ODM    |       | (Redis Queue Store|
   | (Data Persistence)|       +---------+---------+
   +-------------------+                 |
                               +---------v---------+
                               | Dedicated Workers |
                               | - email.worker    |
                               | - notif.worker    |
                               +-------------------+
```

---

## 🛠 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | `>= 18.0.0` | Server JavaScript execution runtime |
| **Framework** | Express.js | `^5.1.0` | HTTP application framework |
| **Primary Database** | MongoDB | `>= 6.0` | Primary document database |
| **ODM** | Mongoose | `^8.16.1` | MongoDB modeling and schema validation |
| **In-Memory Store** | Redis (`ioredis`) | `^5.11.1` | Sessions, rate limiting, geolocation cache, cooldowns |
| **Job Queue** | BullMQ | `^6.1.2` | Distributed job queues for emails and notifications |
| **Authentication** | JWT (`jsonwebtoken`) | `^9.0.2` | Signed Access (15m) and Refresh (30d) tokens |
| **OAuth 2.0** | Passport.js | `^0.7.0` | Social authentication (Google, Facebook, GitHub) |
| **Hashing & Crypto** | `bcryptjs` + `crypto` | `^3.0.2` | Password hashing, OTP hashing, UID generation |
| **Validation** | Joi + Password Complexity | `^17.13.3` | Request payload schema validation |
| **Media Storage** | Cloudinary v2 | `^2.9.0` | Image processing, storage, and CDN delivery |
| **Upload Processing**| Multer | `^2.0.2` | Multipart/form-data memory streaming |
| **Email Delivery** | Nodemailer | `^7.0.13` | SMTP transport client for transactional emails |
| **Device Parsing** | `ua-parser-js` | `^1.0.41` | Browser, OS, and hardware device detection |
| **Phone Parsing** | `libphonenumber-js`| `^1.12.41` | E.164 international phone normalization |

---

## 🧩 System Architecture & Core Subsystems

### 1. Authentication & Session Architecture

Mushrif implements a secure **Dual-Token + Redis Session** pattern designed to prevent token theft while enabling instantaneous, server-side session revocation.

```
       Client                           Server                           Redis
         |                                |                                |
         |--- 1. POST /api/auth/login --->|                                |
         |    (email, password)           |--- 2. Verify credentials ----->|
         |                                |--- 3. Create Session (Lua) --->|
         |                                |<-- 4. SessionId created -------|
         |                                |                                |
         |<-- 5. Response: ---------------|                                |
         |    - Access Token (JSON, 15m)  |                                |
         |    - Refresh Token (Cookie,30d)|                                |
         |                                |                                |
         |--- 6. API Call (Bearer Token)->|                                |
         |    Authorization: Bearer <jwt> |--- 7. Validate JWT Signature   |
         |                                |--- 8. Check Session Exists --->|
         |                                |<-- 9. Valid / Revoked ---------|
         |<-- 10. Data / 401 Unauthorized-|                                |
```

#### Key Architecture Components:
- **Access Token (Short-Lived, 15 Minutes)**:
  - Carries claims: `id` (User ObjectId), `role` (Role array), `sessionId` (UUID), `type: "access"`.
  - Signed using dedicated `ACCESS_TOKEN_SECRET`.
  - Sent by the client in the `Authorization: Bearer <token>` HTTP header.
- **Refresh Token (Long-Lived, 30 Days)**:
  - Carries claims: `id`, `sessionId`, `type: "refresh"`.
  - Signed using dedicated `REFRESH_TOKEN_SECRET`.
  - Stored in an `HttpOnly`, `SameSite=Lax` (or `None` in production with HTTPS), secure cookie.
- **Redis Server-Side Session Tracking**:
  - `mushrif:auth:session:{sessionId}`: Points to `userId` with an automatic 30-day TTL.
  - `mushrif:auth:user:{userId}:sessions`: Redis SET tracking all active `sessionId` instances for a given user.
- **Atomic Session Management (Lua Scripts)**:
  - **Creation**: Atomically sets session key, adds to user set, and updates set expiration.
  - **Single Logout**: Deletes session key and removes the ID from the user set.
  - **Revoke All (`deleteAllUserSessions`)**: Atomically fetches all user session IDs, deletes every session key, and deletes the user session set. Triggered during:
    - User password reset (`/api/password/reset`).
    - Password creation for OAuth accounts (`/api/password/make-password/:id`).
    - Logout from all devices (`/api/auth/logout-all`).
    - Admin account suspension (`/api/admin/suspend/:id`).
- **Fail-Closed Verification**:
  - `verifyToken` middleware validates the JWT and verifies that the `sessionId` exists in Redis for that user.
  - If Redis is offline or experiences connection timeouts, the middleware responds with `503 SerVvice Unavailable` rather than failing open.
- **Role Hierarchy**:
  - Defined in `utils/roleHierarchy.utils.js`:
    $$\text{super\_admin (1)} < \text{admin (2)} < \text{support\_agent (3)} < \text{user (4)}$$
  - Access is evaluated with `hasMinRole(userRole, targetRole)`.
- **OAuth 2.0 Integration**:
  - Google, Facebook, and GitHub strategies configured via Passport.
  - Automatically handles user discovery, account linking, email conflicts, and temporary OAuth placeholders.
  - Returns a responsive developer-friendly HTML authentication page (`renderOAuthSuccessPage`) with one-click token copying and metadata inspection.

---

### 2. Redis Infrastructure & Distributed Operations

Implemented in `config/redis.js` and `services/redis.service.js`:
- **Singleton Connection**: Managed via `ioredis` with exponential backoff (`retryStrategy`) and error handling for connection spikes.
- **Standardized Namespacing**: Format `mushrif:<subsystem>:<entityType>:<identifier>`:
  - Sessions: `mushrif:auth:session:{sessionId}` and `mushrif:auth:user:{userId}:sessions`
  - Rate Limiting: `mushrif:rl:{endpoint}:ip:{safeIp}`
  - Geolocation Cache: `mushrif:geo:ip:{ipAddress}` (7-day TTL)
  - Login Notification Cooldown: `mushrif:cooldown:login_notif:{userId}:{fingerprint}` (1-hour TTL)
- **Non-Blocking Scans**: Safe pattern deletion via `delByPattern` using iterative `SCAN` (strictly avoids blocking `KEYS *`).
- **Fail-Open Data Caching**: Read/write caching operations gracefully return `null` if Redis is offline without crashing incoming HTTP requests.

---

### 3. Asynchronous Task Queues & Workers

Mushrif uses **BullMQ** on Redis to separate long-running asynchronous operations from synchronous HTTP response cycles.

```
+--------------------------+
| Express Request Handler  |
+------------+-------------+
             |
             | Dispatches Job (Non-blocking)
             v
+--------------------------+          +--------------------------+
|  services/notifyUser.js  |          |      Email Queue         |
|                          +--------->|  Name: "mushrif-email"   |
| (Resolves Recipients in  |          +------------+-------------+
|  single DB query)        |                       | Processed By
|                          |          +------------v-------------+
|                          |          |  workers/email.worker.js |
|                          |          |  (Nodemailer SMTP, c=5)  |
|                          |          +--------------------------+
|                          |
|                          |          +--------------------------+
|                          |          |   Notification Queue     |
|                          +--------->| Name: "mushrif-notif..." |
|                          |          +------------+-------------+
+--------------------------+                       | Processed By
                                      +------------v-------------+
                                      | workers/notif.worker.js  |
                                      | (MongoDB write, c=10)    |
                                      +--------------------------+
```

#### Queues & Workers:
1. **Email Queue (`mushrif-email`)**:
   - Defined in `queues/email.queue.js`.
   - Consumer: `workers/email.worker.js` (concurrency: 5).
   - Automatically handles retries (3 attempts with exponential backoff starting at 5s).
   - Dispatches transactional HTML emails for welcome notifications, security alerts, and verification.
2. **Notification Queue (`mushrif-notification`)**:
   - Defined in `queues/notification.queue.js`.
   - Consumer: `workers/notification.worker.js` (concurrency: 10).
   - Persists in-app notifications directly into MongoDB with dynamic translation parameters.
3. **Unified Dispatcher (`services/notifyUser.service.js`)**:
   - Accepts array of `userIds`, user preferences (`email`, `inApp`), and payloads.
   - Batch resolves recipient emails in a single query (`$in: uniqueUserIds`).
   - Dispatches queue jobs concurrently with `Promise.all`.

---

### 4. Rate Limiting Subsystem

Centralized in `middlewares/rateLimiter.middleware.js`:
- **Atomic Distributed Counters**: Uses a Redis Lua script executing `INCR` followed by `EXPIRE` on first access.
- **Fail-Safe In-Memory Fallback**: If Redis is offline, automatically switches to a local, bounded in-memory map to maintain application protection.
- **Standard Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed in current window.
  - `X-RateLimit-Remaining`: Remaining request quota.
  - `X-RateLimit-Reset`: Unix timestamp when quota resets.
  - `Retry-After`: Seconds to wait before retrying (sent on HTTP 429).
- **Configured Limits**:
  - Login: 5 requests / 15 minutes (`RL_LOGIN_MAX`, `RL_LOGIN_WINDOW`)
  - Registration: 5 requests / 1 hour (`RL_REGISTER_MAX`, `RL_REGISTER_WINDOW`)
  - Forgot Password: 3 requests / 15 minutes (`RL_FORGOT_PASSWORD_MAX`, `RL_FORGOT_PASSWORD_WINDOW`)
  - Reset Password: 5 requests / 15 minutes (`RL_RESET_PASSWORD_MAX`, `RL_RESET_PASSWORD_WINDOW`)
  - Email Verification Request: 3 requests / 15 minutes (`RL_VERIFY_EMAIL_MAX`, `RL_VERIFY_EMAIL_WINDOW`)
  - Email Token Validation: 10 requests / 15 minutes
  - Email Change OTP Request: 3 requests / 15 minutes
  - Email Change OTP Verification: 5 attempts / 15 minutes (`RL_OTP_MAX`, `RL_OTP_WINDOW`)
  - OAuth Initiation: 20 requests / 15 minutes (`RL_OAUTH_MAX`, `RL_OAUTH_WINDOW`)

---

### 5. Internationalization (i18n) & Dynamic Messaging

- **Languages Supported**: Arabic (`ar`, default), English (`en`), French (`fr`).
- **Header Extraction**: `middlewares/lang.middleware.js` inspects `accept-language` and sets `req.lang`.
- **Dynamic Translation**: `utils/t.utils.js` replaces `{{placeholder}}` variables in localized JSON files (`i18n/*.json`).
- **Constant Keys**: `constants/messages.js` uses an ES6 `Proxy` to safely provide type-agnostic message keys.
- **Localized Notifications**: Notifications store the translation key (`title`, `message`) and a `vars` JSON object in MongoDB; translation occurs dynamically upon client retrieval or email dispatch.

---

### 6. Work & Organization Management Domain

The backend includes a comprehensive organizational data architecture designed for multi-tenant workspace and project management:

```
+-----------------------------------------------------------+
|                   Organization Model                      |
| (Name, Slug, OwnerId, Settings, Logo, Default Locale/TZ)  |
+-----------------------------+-----------------------------+
                              |
       +----------------------+----------------------+
       | 1:N                                         | 1:N
+------v--------------------+                 +------v--------------------+
| OrganizationMember Model  |                 |      Workspace Model      |
| (OWNER, ADMIN, MEMBER)    |                 | (Settings, Views, Status) |
+---------------------------+                 +-------------+-------------+
                                                            |
                                     +----------------------+----------------------+
                                     | 1:N                                         | 1:N
                              +------v--------------------+                 +------v--------------------+
                              |  WorkspaceMember Model    |                 |       Project Model       |
                              |  (ADMIN, MEMBER, GUEST)   |                 | (Key, Name, Owner, Status)|
                              +---------------------------+                 +-------------+-------------+
                                                                                          |
                                                   +--------------------------------------+----------------------+
                                                   | 1:N                                  | 1:N                  | 1:N
                                            +------v-------------+                 +------v-------------+ +------v-------------+
                                            |   WorkItem Model   |                 |    Milestone Model | |     Epic Model     |
                                            | (TASK, BUG, STORY) |                 | (Due Date, Status) | | (Planning, Active) |
                                            +------+-------------+                 +--------------------+ +--------------------+
                                                   |
                        +--------------------------+--------------------------+
                        | 1:N                                                 | 1:N
                 +------v-------------+                                +------v-------------+
                 |   Comment Model    |                                |  Attachment Model  |
                 | (Threaded, Author) |                                | (Cloudinary/Files) |
                 +--------------------+                                +--------------------+
```

#### Domain Models Implemented:
1. **Organization (`models/work/Organization.model.js`)**: Name, slug, owner reference, logo, multi-tenant preferences (timezone, default language, date/time format, week starts on, notifications).
2. **OrganizationMember (`models/work/OrganizationMember.model.js`)**: Links User to Organization with roles (`OWNER`, `ADMIN`, `MEMBER`) and statuses (`INVITED`, `ACTIVE`, `SUSPENDED`, `REMOVED`).
3. **Workspace & WorkspaceMember (`models/work/workspace.model.js`, `WorkspaceMember.model.js`)**: Independent organizational units.
4. **Project & ProjectMember (`models/work/Project.model.js`, `ProjectMember.model.js`)**: Unique project keys (e.g. `PROJ`), priority, status, and issue counter.
5. **Team & TeamMember (`models/work/Team.model.js`, `TeamMember.model.js`)**: Team groupings within workspaces.
6. **WorkItem (`models/work/WorkItem.model.js`)**: Tasks, Bugs, Stories with sequential project issue numbers, kanban status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), priorities, and assignees.
7. **Epics & Milestones (`models/work/Epic.model.js`, `Milestone.model.js`)**: High-level roadmaps and release targets.
8. **Comments, Attachments, Labels, & Activities (`models/work/`)**: Threaded discussions, Cloudinary attachments, project taxonomy, and immutable audit logs.

---

### 7. Cloud Storage & Media Uploads

- **Storage Provider**: Cloudinary via `services/cloudinary.service.js`.
- **Upload Pipeline**: Multer memory storage (`middlewares/upload.middleware.js`) streams image buffers directly to Cloudinary without creating temporary disk files.
- **Transaction Safety**: In `organizationController.js`, image uploads execute *before* opening the MongoDB database transaction. If the database transaction fails, uploaded images are automatically pruned from Cloudinary to prevent orphaned storage.

---

## 📡 API Route Reference

### Authentication (`/api/auth`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | 5 / 1h | Registers user, hashes password, generates 10-char alphanumeric UID, creates welcome notification, issues Access Token & Refresh Token cookie. |
| `POST` | `/api/auth/login` | Public | 5 / 15m | Verifies credentials, records login history, handles login email alert cooldown, creates Redis session, returns tokens. |
| `POST` | `/api/auth/refresh` | Public | None | Reads HttpOnly `refreshToken` cookie, verifies Redis session, issues new short-lived Access Token. |
| `POST` | `/api/auth/logout` | Private/Public | None | Revokes current session in Redis and clears the refresh cookie. |
| `POST` | `/api/auth/logout-all` | Private | None | Atomically revokes all active Redis sessions for the user across all devices. |
| `POST` | `/api/auth/complete-profile/:id` | Private (Self) | 10 / 15m | Completes phone, DOB, and gender for OAuth users. |
| `GET` | `/api/auth/google` | Public | 20 / 15m | Initiates Google OAuth 2.0 flow. |
| `GET` | `/api/auth/google/callback` | Public | None | Google callback, issues tokens, and renders developer success UI. |
| `GET` | `/api/auth/facebook` | Public | 20 / 15m | Initiates Facebook OAuth flow. |
| `GET` | `/api/auth/facebook/callback` | Public | None | Facebook callback handler. |
| `GET` | `/api/auth/github` | Public | 20 / 15m | Initiates GitHub OAuth flow. |
| `GET` | `/api/auth/github/callback` | Public | None | GitHub callback handler (fetches primary email via GitHub API). |

---

### Password Management (`/api/password`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/password/forgot` | Public | 3 / 15m | Generates 64-character hex verification token and emails reset link. |
| `GET` | `/api/password/validate/:token` | Public | 10 / 15m | Validates existence and expiry of password reset token. |
| `POST` | `/api/password/reset` | Public | 5 / 15m | Updates password, consumes token, revokes all active Redis sessions, sends security alerts. |
| `POST` | `/api/password/make-password/:id`| Private (Self) | None | Enables OAuth users to set a local password, linking a `local` provider and revoking sessions. |

---

### Email Verification & Updates (`/api/emails`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/emails/:id/verify-email` | Private (Self) | 3 / 15m | Sends email verification token link. |
| `GET` | `/api/emails/validate-email/:token`| Public | 10 / 15m | Checks if verification token exists and is valid. |
| `POST` | `/api/emails/verify-email` | Public | 10 / 15m | Validates token, marks `isVerified = true`, deletes token. |
| `POST` | `/api/emails/:id/change-email-request`| Private (Self) | 3 / 15m | Generates 6-digit hashed OTP and sends it to current email. |
| `GET` | `/api/emails/:id/change-email-verify-otp`| Private (Self)| 5 / 15m | Validates 6-digit numeric OTP. |
| `PATCH` | `/api/emails/:id/change-email` | Private (Self) | 5 / 15m | Changes email, sets `isVerified = false`, dispatches verification email to new address and security alert to old address. |

---

### User Management (`/api/users`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `PATCH` | `/api/users/:id/profile` | Private (Self) | None | Updates profile fields (username, names, bio, social media links). |
| `PATCH` | `/api/users/:id/profile-photo` | Private (Self) | None | Uploads profile picture to Cloudinary and deletes old picture. |

---

### Administration & Moderation (`/api/admin`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `PUT` | `/api/admin/suspend/:id` | Admin/SuperAdmin | None | Deactivates account (`isActive = false`), atomically revokes all user sessions in Redis. |
| `PUT` | `/api/admin/unsuspend/:id` | Admin/SuperAdmin | None | Reactivates suspended account (`isActive = true`). |

---

### Organization & Work Domain (`/api/work/organizations`)

| Method | Route | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/work/organizations/` | Private | None | Creates organization with optional logo upload (Cloudinary) in a MongoDB transaction, sets owner member, and sends notifications. |
| `GET` | `/api/work/organizations/:organizationId/members` | Private (Member) | None | Retrieves all active members for the specified organization. |
| `PATCH` | `/api/work/organizations/:organizationId/settings`| Private (Owner/Admin) | None | Partially updates organization preferences and settings. |

---

## 🗄 Database Models & Domain Schema

### 1. User (`models/auth/User.model.js`)
```javascript
{
  username: { type: String, unique: true, required: true },
  uid: { type: String, unique: true, required: true, length: 10 }, // 10-char alphanumeric uppercase
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phoneNumber: {
    countryCode: String, // format: +XXX
    localNumber: String,
    fullNumber: String   // normalized E.164
  },
  dateOfBirth: Date,     // validated age 13-120
  gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
  password: String,      // bcrypt hashed
  providers: [{
    provider: String,    // "local", "google", "facebook", "github"
    providerId: String,
    email: String,
    displayName: String,
    photoURL: String,
    accessToken: String,
    refreshToken: String
  }],
  authMethods: [String],
  primaryProvider: { type: String, default: "local" },
  profilePhoto: { url: String, publicId: String },
  role: [{ type: String, enum: ["user", "support_agent", "admin", "super_admin"], default: ["user"] }],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  loginHistory: [{
    ipAddress: String,
    userAgent: String,
    browser: { name: String, version: String, major: String },
    device: { type: String, vendor: String, model: String },
    os: { name: String, version: String },
    location: { country: String, city: String, timezone: String, latitude: Number, longitude: Number },
    loginTime: Date,
    isSuccessful: Boolean,
    provider: String
  }],
  lastLoginIP: String,
  lastLoginTime: Date,
  hasWelcomeNotification: Boolean
}
```

### 2. VerificationToken & OTP (`models/auth/`)
- **VerificationToken**: Stores 64-hex tokens for `RESET_PASSWORD` (10m TTL) and `VERIFY_EMAIL` (24h TTL) with automatic MongoDB index expiry.
- **OTP**: Stores 6-digit bcrypt-hashed numeric codes for `CHANGE_EMAIL` and `LOGIN` with automatic MongoDB index expiry.

### 3. Notification (`models/Notification.js`)
- Stores `userId`, `title` (message key), `message` (message key), `vars` (dynamic data dictionary), `isRead`, `priority`, `type`, with a 90-day automatic TTL index.

---

## ⚙️ Environment Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `8000` | Port for the Express HTTP server |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`) |
| `MONGO_URI` | **Yes** | — | MongoDB connection connection string |
| `ACCESS_TOKEN_SECRET` | **Yes** | — | Secret key used to sign 15-minute Access Tokens |
| `REFRESH_TOKEN_SECRET` | **Yes** | — | Secret key used to sign 30-day Refresh Tokens |
| `SESSION_SECRET` | **Yes** | — | Secret key for Express sessions |
| `REDIS_HOST` | No | `127.0.0.1` | Redis server host |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | `""` | Redis authentication password |
| `REDIS_DB` | No | `0` | Redis logical database index |
| `REDIS_TLS` | No | `false` | Enable TLS/SSL connection for Redis |
| `SMTP_HOST` | **Yes** | — | SMTP mail server hostname |
| `SMTP_PORT` | **Yes** | `587` | SMTP port (465 for SSL, 587 for TLS) |
| `SMTP_USER` | **Yes** | — | SMTP authentication user |
| `SMTP_PASS` | **Yes** | — | SMTP authentication password |
| `SMTP_FROM` | **Yes** | — | Sender email address for outgoing mail |
| `CLOUDINARY_CLOUD_NAME`| **Yes**| — | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | **Yes** | — | Cloudinary API access key |
| `CLOUDINARY_API_SECRET`| **Yes** | — | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Optional | — | Google OAuth client identifier |
| `GOOGLE_CLIENT_SECRET`| Optional | — | Google OAuth client secret |
| `FACEBOOK_APP_ID` | Optional | — | Facebook App ID |
| `FACEBOOK_APP_SECRET` | Optional | — | Facebook App Secret |
| `GITHUB_CLIENT_ID` | Optional | — | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET`| Optional | — | GitHub OAuth Client Secret |
| `CLIENT_URL` | No | `http://localhost:3000` | Frontend web client URL |
| `SERVER_URL` | No | `http://localhost:8000` | Backend API server URL |

---

## 🚀 Getting Started & Operational Commands

### 1. Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **MongoDB**: Local daemon or MongoDB Atlas instance
- **Redis**: Local server or managed Redis (Upstash, AWS ElastiCache)

### 2. Setup
```bash
# Clone repository
git clone https://github.com/AbdelmoumaineNessah2002/Mushrif-App-Back-end.git
cd Mushrif-App-Back-end

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 3. Running the Application
```bash
# Start API server in development mode (with nodemon)
npm start

# Start API server directly
node app.js

# Start BullMQ Email Worker (Dedicated process)
npm run worker:email

# Start BullMQ In-App Notification Worker (Dedicated process)
node workers/notification.worker.js
```

---

## 🔍 Codebase Audit & Technical Observations

During this comprehensive code audit, the following findings and implementation nuances were noted:

1. **`controllers/work/organizationMemberController.js`**:
   - Lines 19 & 180 call `validateObjectId({ id: ... })`, but `validateObjectId` is **not imported** in the file.
   - Line 8 imports `{ OrganizationMember }` via destructuring, whereas `models/work/OrganizationMember.model.js` exports `module.exports = mongoose.model(...)`.
   - `createOrganizationMemberCtrl` is fully written but **not mounted** in `routes/work/OrganizationRoute.js`.
2. **`routes/userRoute.js`**:
   - Route `PATCH /:id/profile-photo` passes `uploadSingleImage` directly without calling it with an argument (e.g. `uploadSingleImage("profilePhoto")`). As written in `middlewares/upload.middleware.js`, `uploadSingleImage` is a factory function returning Express middleware `(req, res, next)`.
3. **Deprecated User Token Method**:
   - `userSchema.methods.generateAuthToken` in `models/auth/User.model.js` uses legacy `JWT_SECRET` (30 days). The active application architecture uses `utils/token.utils.js` and `services/session.service.js`.
4. **UID Specification**:
   - Previous documentation referenced an 8-digit numeric UID; the actual implementation in `utils/generateUID.utils.js` generates a **10-character alphanumeric uppercase** identifier (`[A-Z0-9]{10}`).
5. **Work Domain Controllers**:
   - Full Mongoose models exist for `Workspace`, `Project`, `Team`, `WorkItem`, `Milestone`, `Epic`, `Comment`, `Attachment`, `Activity`, and `Label`. However, their corresponding routes and controllers remain to be implemented in upcoming phases.

---

## 📄 License & Authors

- **License**: ISC
- **Author**: Abdelmoumaine Nessah ([@AbdelmoumaineNessah2002](https://github.com/AbdelmoumaineNessah2002/))
- **Repository**: [Mushrif-App-Back-end](https://github.com/AbdelmoumaineNessah2002/Mushrif-App-Back-end)
