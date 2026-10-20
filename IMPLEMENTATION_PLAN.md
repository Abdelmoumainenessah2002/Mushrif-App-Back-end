# Mushrif Backend — Implementation Plan & Architectural Roadmap

**Project**: Mushrif (مشرف) App Backend  
**Audit & Synchronization Date**: September 2026  
**Status**: Active Development (Phase 2: Organization & Work Domain)  
**Architecture**: Node.js + Express.js 5 + MongoDB + Redis + BullMQ (Distributed Asynchronous MERN Stack)

---

## 📋 Table of Contents

1. [Executive Summary & Codebase Audit](#1-executive-summary--codebase-audit)
2. [Current State Analysis (Reality vs. Legacy Plan)](#2-current-state-analysis-reality-vs-legacy-plan)
3. [Phase 1: Foundation, Security & Core Auth (COMPLETED ✅)](#3-phase-1-foundation-security--core-auth-completed-)
4. [Phase 2: Organization & Work Domain Foundation (IN PROGRESS 🟡)](#4-phase-2-organization--work-domain-foundation-in-progress-)
5. [Phase 3: Workspaces & Project Management Engine (PLANNED 🔵)](#5-phase-3-workspaces--project-management-engine-planned-)
6. [Phase 4: Collaboration, Communication & Assets (PLANNED 🔵)](#6-phase-4-collaboration-communication--assets-planned-)
7. [Phase 5: Observability, Testing & Production Readiness (PLANNED 🔵)](#7-phase-5-observability-testing--production-readiness-planned-)
8. [Technical Debt, Bugs & Remediation Registry](#8-technical-debt-bugs--remediation-registry)
9. [Detailed Milestone Timeline](#9-detailed-milestone-timeline)

---

## 1. Executive Summary & Codebase Audit

A comprehensive, read-only architectural audit of the entire Mushrif backend repository was conducted to synchronize the technical documentation with the actual code in production and active development.

The audit revealed that significant infrastructure and feature developments have occurred since the initial 2026-08-18 implementation plan:
- **Redis Infrastructure**: Fully designed and deployed with a centralized connection manager (`config/redis.js`), exponential backoff, health checking, and high-level abstraction service (`services/redis.service.js`).
- **Dual-Token & Session Architecture**: Fully implemented with short-lived (15m) Access Tokens, long-lived (30d) Refresh Tokens stored in HttpOnly cookies, and atomic Redis-backed session tracking (`services/session.service.js`) with immediate revocation capabilities.
- **Distributed Rate Limiting**: Deployed across all sensitive endpoints using atomic Redis Lua scripts with an automatic, bounded in-memory fallback mechanism.
- **Asynchronous Task Queues**: Built with BullMQ (`mushrif-email` and `mushrif-notification`) and decoupled background workers.
- **Internationalization (i18n)**: Multi-language support (Arabic, English, French) with parameterized variable substitution and dynamic request-header extraction.
- **Work & Organization Domain Foundation**: Complete Mongoose data models established for Organizations, Workspaces, Projects, Teams, WorkItems, Milestones, Epics, Comments, Attachments, and Activities. Organization creation with MongoDB transactions and Cloudinary integration is active.

This document serves as the **authoritative technical implementation roadmap**, reflecting what is actually implemented, identifying active defects to fix, and outlining future development phases.

---

## 2. Current State Analysis (Reality vs. Legacy Plan)

| Component / Feature | Legacy Plan Claim | Actual Reality in Codebase | Status |
|---|---|---|---|
| **Redis Connection & Abstraction** | "Not implemented / URGENT" | Implemented (`config/redis.js`, `services/redis.service.js`) with atomic Lua scripts, SCAN deletion, fail-open cache. | **Completed** |
| **Authentication & Sessions** | "Basic JWT (30d) / express-session" | Dual JWT (15m Access + 30d Refresh cookie) with server-side Redis sessions and atomic revocation. | **Completed** |
| **Rate Limiting** | "Not implemented" | Distributed Redis rate limiting with atomic Lua counter, standard headers, and in-memory fallback (`middlewares/rateLimiter.middleware.js`). | **Completed** |
| **Background Queues & Workers** | "Not implemented" | BullMQ email (`queues/email.queue.js`, `workers/email.worker.js`) and notification queues (`queues/notification.queue.js`, `workers/notification.worker.js`). | **Completed** |
| **Email Verification Flow** | "Incomplete flow" | Full token verification (`/api/emails/verify-email`) with 24h expiration, resend, and token validation. | **Completed** |
| **Password Reset Flow** | "Partially implemented" | End-to-end flow with token validation, reset, email notification, and all-device session revocation (`/api/password/reset`). | **Completed** |
| **Email Change with OTP** | "Not planned" | Multi-step change email with 6-digit hashed OTP and security alert sent to old address. | **Completed** |
| **OAuth Integration** | "Basic Google/FB/GitHub" | Multi-provider OAuth with account linking, IP geolocation, developer success HTML page, and profile completion. | **Completed** |
| **Admin Controls** | "Basic structure" | Account suspension & unsuspension with instant Redis session revocation and role hierarchy (`super_admin`, `admin`, `support_agent`, `user`). | **Completed** |
| **Work / Organization Domain** | "Unplanned / Roadmap Phase 2" | 15 Mongoose schemas created for work domain; Organization creation, settings update, and members listing implemented. | **In Progress** |
| **Workspaces & Projects** | "Roadmap Phase 2" | Schemas created; controllers and routes pending implementation. | **Planned** |
| **Tasks / WorkItems / Kanban** | "Roadmap Phase 2" | WorkItem schema created (types, kanban states, issue numbers); routes pending. | **Planned** |
| **Logging System** | "console.log only" | console.log with timestamp/module tagging; Winston/Pino structured logging pending. | **Planned** |
| **OpenAPI / Swagger Docs** | "Missing" | API_TESTING.md exists; automated Swagger/OpenAPI documentation pending. | **Planned** |

---

## 3. Phase 1: Foundation, Security & Core Auth (COMPLETED ✅)

### 3.1 Redis Core Infrastructure & Resilience
- [x] Singleton `ioredis` connection client in `config/redis.js`.
- [x] Exponential backoff reconnection strategy with connection timeout (10s) and command timeout (3s).
- [x] Redis cluster / TLS support via `REDIS_TLS` flag.
- [x] High-level service abstraction (`services/redis.service.js`) with standardized namespacing (`mushrif:<subsystem>:<entityType>:<identifier>`).
- [x] Non-blocking iterative key deletion using `SCAN` (`delByPattern`) avoiding blocking `KEYS *`.
- [x] Fail-open caching logic (returns `null` without crashing HTTP requests when Redis is unavailable).
- [x] Redis health check and ping latency diagnostic (`pingRedis()`).

### 3.2 Dual-Token & Redis Session Management
- [x] Short-lived Access Token (15 minutes) signed with `ACCESS_TOKEN_SECRET` containing `id`, `role`, and `sessionId`.
- [x] Long-lived Refresh Token (30 days) signed with `REFRESH_TOKEN_SECRET` containing `id` and `sessionId`.
- [x] Refresh Token delivered via HttpOnly, secure, SameSite cookie (`utils/token.utils.js`).
- [x] Token refresh endpoint (`POST /api/auth/refresh`) validating Redis session ownership.
- [x] Server-side Redis session storage:
  - `mushrif:auth:session:{sessionId}` -> `userId` (TTL 30 days)
  - `mushrif:auth:user:{userId}:sessions` -> Redis SET of active session IDs
- [x] Atomic session operations via Redis Lua scripts:
  - `CREATE_SESSION_LUA`: Atomically records session and adds to user session SET with TTL.
  - `DELETE_SESSION_LUA`: Single session removal (device logout).
  - `DELETE_ALL_SESSIONS_LUA`: Revokes all sessions for a user (logout all devices, password reset, account suspension).
- [x] Background session pruning via pipelined Redis operations (`pruneStaleUserSessions`).
- [x] Fail-closed authentication middleware (`middlewares/verifyJWTToken.middleware.js` returns HTTP 503 if Redis is unreachable).

### 3.3 Distributed Rate Limiting Subsystem
- [x] Centralized Redis rate limiter factory (`middlewares/rateLimiter.middleware.js`) using atomic Lua script (Fixed Window Counter: `INCR` + `EXPIRE`).
- [x] Bounded in-memory fallback map ensuring protection even during Redis downtime.
- [x] Standard response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.
- [x] Dedicated limiters configured and mounted:
  - `/api/auth/login`: 5 attempts / 15m
  - `/api/auth/register`: 5 attempts / 1h
  - `/api/auth/complete-profile/:id`: 10 attempts / 15m
  - `/api/password/forgot`: 3 requests / 15m
  - `/api/password/reset`: 5 attempts / 15m
  - `/api/password/validate/:token`: 10 attempts / 15m
  - `/api/emails/:id/verify-email`: 3 requests / 15m
  - `/api/emails/validate-email/:token`: 10 attempts / 15m
  - `/api/emails/verify-email`: 10 attempts / 15m
  - `/api/emails/:id/change-email-request`: 3 requests / 15m
  - `/api/emails/:id/change-email-verify-otp` & PATCH: 5 attempts / 15m
  - OAuth initiation: 20 requests / 15m

### 3.4 Asynchronous Queues & Background Workers
- [x] BullMQ connection setup independent of application command timeouts (`queues/email.queue.js`, `queues/notification.queue.js`).
- [x] Email Queue (`mushrif-email`) with automatic retry (3 attempts, 5s exponential backoff).
- [x] Notification Queue (`mushrif-notification`) with automatic retry.
- [x] Dedicated Email Worker (`workers/email.worker.js`) executing Nodemailer SMTP delivery with concurrency 5.
- [x] Dedicated Notification Worker (`workers/notification.worker.js`) persisting MongoDB notifications with concurrency 10.
- [x] Unified dispatcher (`services/notifyUser.service.js`) resolving recipient data in a single batch query without blocking HTTP responses.

### 3.5 Security, Identification & User Profile
- [x] 10-character alphanumeric uppercase UID generation (`utils/generateUID.utils.js`).
- [x] Deterministic base username formatting (`firstname.lastname`) with auto-increment collision resolution.
- [x] Strict E.164 phone normalization with `libphonenumber-js` (`utils/phoneUtils.utils.js`).
- [x] IP Geolocation lookup (`ip-api.com`) with 7-day TTL Redis caching (`utils/loginHistoryHelper.utils.js`).
- [x] Login notification email alert cooldown (1-hour TTL via Redis `SET NX EX` fingerprint).
- [x] Email verification flow with 64-hex tokens (24-hour TTL).
- [x] Password reset flow with 64-hex tokens (10-minute TTL) and automatic all-device session revocation.
- [x] Email change process: 6-digit hashed OTP (10m TTL), updates user email, marks unverified, queues verification email to new address and security alert to old address.
- [x] Role hierarchy verification (`super_admin` > `admin` > `support_agent` > `user`).
- [x] Admin account suspension and unsuspension with instant Redis session termination (`controllers/adminController.js`).
- [x] OAuth 2.0 (Google, Facebook, GitHub) with account linking and developer HTML response UI.

### 3.6 Internationalization (i18n)
- [x] Arabic (`ar`), English (`en`), and French (`fr`) translation dictionaries (`i18n/*.json`).
- [x] Header-based language extraction middleware (`middlewares/lang.middleware.js`).
- [x] Parameterized variable replacement (`utils/t.utils.js`) for dynamic values.
- [x] ES6 Proxy-based message keys (`constants/messages.js`).
- [x] Database notification schema stores translation keys and parameters, deferring localization to rendering.

---

## 4. Phase 2: Organization & Work Domain Foundation (IN PROGRESS 🟡)

### 4.1 Current Implementation State
- [x] **Mongoose Domain Schemas**:
  - `Organization.model.js`: Organization profile, multi-tenant preferences (timezone, default language, date/time format, week starts on, notifications), soft deletion.
  - `OrganizationMember.model.js`: Membership association with roles (`OWNER`, `ADMIN`, `MEMBER`) and statuses (`INVITED`, `ACTIVE`, `SUSPENDED`, `REMOVED`).
  - `workspace.model.js` & `WorkspaceMember.model.js`.
  - `Project.model.js` & `ProjectMember.model.js`.
  - `Team.model.js` & `TeamMember.model.js`.
  - `WorkItem.model.js`, `Milestone.model.js`, `Epic.model.js`.
  - `Comment.model.js`, `Attachment.model.js`, `Activity.Model.js`, `Label.model.js`.
- [x] **Organization Creation with Media & Transactions**:
  - Controller: `createOrganizationCtrl` in `controllers/work/organizationController.js`.
  - Multer memory upload streaming to Cloudinary (`Mushrif/organizations/:orgId/logo`).
  - Upload executed before transaction to minimize lock time.
  - MongoDB transaction commits Organization document and initializes Owner membership.
  - Compensating rollback: Deletes Cloudinary image if database transaction fails.
  - Dispatches welcome notification and email via `notifyUser` background queue.
- [x] **Organization Settings Management**:
  - Controller: `modifyOrganizationSettingsCtrl`.
  - Validation: `validateModifyOrganizationSettings` schema.
  - Authorization: Restricted to organization Owner or active Admin.
- [x] **Organization Members Listing**:
  - Controller: `getOrganizationMembersCtrl` in `controllers/work/organizationMemberController.js`.
  - Authorization: Requires active organization membership.
  - Populates member user name and email.

### 4.2 Immediate Priorities & Remediation Tasks (Current Sprint)

#### Task 2.1: Fix `organizationMemberController.js` Defects & Mount Member Routes
- **Issue**:
  1. Lines 19 & 180 call `validateObjectId({ id: ... })`, but `validateObjectId` is not imported.
  2. Line 8 attempts `const { OrganizationMember } = require(...)`, but the model exports the Mongoose model directly (`module.exports = mongoose.model(...)`).
  3. `createOrganizationMemberCtrl` is implemented but omitted from `routes/work/OrganizationRoute.js`.
- **Action Plan**:
  - Add standard ObjectId validation utility or use `mongoose.Types.ObjectId.isValid()`.
  - Fix import: `const OrganizationMember = require("../../models/work/OrganizationMember.model")`.
  - Mount `POST /:organizationId/members` in `routes/work/OrganizationRoute.js`.
  - Mount `PATCH /:organizationId/members/:memberId/role` for role changes (OWNER only).
  - Mount `DELETE /:organizationId/members/:memberId` for member removal.

#### Task 2.2: Implement Member Invitation & Acceptance Workflow
- **Features**:
  - Support inviting external users by email (creates temporary invite or links existing User).
  - Generate invitation token or notification with acceptance link.
  - Endpoint `POST /api/work/organizations/invitations/:token/accept` to transition member status from `INVITED` to `ACTIVE`.

#### Task 2.3: Fix `routes/userRoute.js` Profile Photo Middleware
- **Issue**: `uploadSingleImage` is passed directly as route middleware without invoking the factory (`uploadSingleImage("profilePhoto")`).
- **Action Plan**:
  - Update route definition: `router.patch('/:id/profile-photo', verifyTokenAndOnlyUser, uploadSingleImage("profilePhoto"), updateUserProfilePhotoCtrl)`.

---

## 5. Phase 3: Workspaces & Project Management Engine (PLANNED 🔵)

### 5.1 Workspace Management Subsystem
- [ ] **Workspace Controller & Routes** (`/api/work/workspaces`):
  - `POST /api/work/organizations/:organizationId/workspaces`: Create workspace (Admin/Owner).
  - `GET /api/work/organizations/:organizationId/workspaces`: List workspaces for organization.
  - `GET /api/work/workspaces/:workspaceId`: Retrieve workspace details.
  - `PATCH /api/work/workspaces/:workspaceId`: Update workspace name, description, settings.
  - `DELETE /api/work/workspaces/:workspaceId`: Soft delete / archive workspace.
- [ ] **Workspace Membership & Access Control**:
  - `POST /api/work/workspaces/:workspaceId/members`: Add member (`ADMIN`, `MEMBER`, `GUEST`).
  - `GET /api/work/workspaces/:workspaceId/members`: List workspace members.
  - `DELETE /api/work/workspaces/:workspaceId/members/:userId`: Remove workspace member.

### 5.2 Project Management Engine
- [ ] **Project Controller & Routes** (`/api/work/projects`):
  - `POST /api/work/workspaces/:workspaceId/projects`: Create project with unique alphanumeric key (e.g., `MUSH`).
  - `GET /api/work/workspaces/:workspaceId/projects`: List projects in workspace.
  - `GET /api/work/projects/:projectId`: Project details with progress summary.
  - `PATCH /api/work/projects/:projectId`: Update project metadata, status (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`), and dates.
  - `DELETE /api/work/projects/:projectId`: Archive project.
- [ ] **Project Membership**:
  - Project roles: `PROJECT_ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`.
  - Membership endpoints for team assignment.

### 5.3 WorkItem & Kanban Engine
- [ ] **WorkItem Controller & Routes** (`/api/work/work-items`):
  - `POST /api/work/projects/:projectId/items`: Create WorkItem (`TASK`, `BUG`, `STORY`).
    - Auto-increment `workItemCounter` on Project and assign sequential issue `number`.
    - Generates composite key (e.g. `MUSH-42`).
  - `GET /api/work/projects/:projectId/items`: List items with filtering (status, assignee, priority, sprint, epic).
  - `GET /api/work/items/:itemId`: Detailed item view with comments, attachments, activity log.
  - `PATCH /api/work/items/:itemId`: Update title, description, estimate, dates.
  - `PATCH /api/work/items/:itemId/status`: Status transition (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with position re-ordering.
  - `PATCH /api/work/items/:itemId/assign`: Assign/unassign users.
  - `DELETE /api/work/items/:itemId`: Soft delete work item.
- [ ] **Epics & Milestones**:
  - Epic roadmap endpoints (`/api/work/projects/:projectId/epics`).
  - Milestone sprint target endpoints (`/api/work/projects/:projectId/milestones`).

---

## 6. Phase 4: Collaboration, Communication & Assets (PLANNED 🔵)

### 6.1 Team Organization
- [ ] **Team Controller & Routes** (`/api/work/teams`):
  - Workspace team creation, avatar upload, and membership management (`LEAD`, `MEMBER`).
  - Team assignment to projects.

### 6.2 Threaded Comments & Activity Auditing
- [ ] **Comment Service & Endpoints** (`/api/work/items/:itemId/comments`):
  - Add rich text comment with parent comment support (nested replies).
  - Edit and soft-delete comments.
- [ ] **Automated Activity Logging** (`models/work/Activity.Model.js`):
  - Automatic audit trail for status changes, priority shifts, assignments, and file additions.
  - Query endpoint: `GET /api/work/projects/:projectId/activity`.

### 6.3 Attachments & Taxonomy
- [ ] **Attachment Service**:
  - Direct file upload to Cloudinary or AWS S3 (raw files, images, documents).
  - Link attachments to WorkItems.
- [ ] **Project Labels**:
  - Custom color-coded labels per project (`/api/work/projects/:projectId/labels`).

---

## 7. Phase 5: Observability, Testing & Production Readiness (PLANNED 🔵)

### 7.1 Structured Logging & Monitoring
- [ ] Replace `console.log` with structured JSON logger (**Pino** or **Winston**).
- [ ] Request correlation IDs (`X-Request-ID`) propagated through HTTP headers and BullMQ jobs.
- [ ] Centralized error handling middleware returning standardized JSON responses.

### 7.2 API Documentation & Developer Portal
- [ ] OpenAPI 3.0 / Swagger specification integration via `swagger-jsdoc` and `swagger-ui-express`.
- [ ] Interactive API documentation mounted at `/api/docs`.

### 7.3 Automated Test Suite
- [ ] Configure Node.js native test runner (`node --test`) with proper directory pathing.
- [ ] Unit tests for utilities (UID generation, phone normalization, role hierarchy).
- [ ] Integration tests using `ioredis-mock` and in-memory MongoDB (`mongodb-memory-server`):
  - Full registration & login flow.
  - Token refresh and cookie handling.
  - Rate limiting behavior & fallback transitions.
  - Organization creation transaction rollback tests.

### 7.4 Deployment & Containerization
- [ ] `Dockerfile` optimized for multi-stage production builds.
- [ ] `docker-compose.yml` defining services:
  - `api`: Node.js backend server.
  - `email-worker`: Dedicated BullMQ email processor.
  - `notification-worker`: Dedicated BullMQ notification processor.
  - `mongo`: MongoDB database instance.
  - `redis`: Redis cache and queue store.
- [ ] Health check endpoints (`/health/live`, `/health/ready`) checking MongoDB and Redis connections.

---

## 8. Technical Debt, Bugs & Remediation Registry

| ID | Location | Description | Severity | Remediation Plan |
|---|---|---|---|---|
| **BUG-01** | `controllers/work/organizationMemberController.js:19, 180` | `validateObjectId` is invoked but never imported or defined. | **High** | Import a shared ObjectId validator or replace with `mongoose.Types.ObjectId.isValid()`. |
| **BUG-02** | `controllers/work/organizationMemberController.js:8` | Destructuring `{ OrganizationMember }` when model exports default Mongoose model. | **High** | Change to `const OrganizationMember = require(...)`. |
| **BUG-03** | `routes/work/OrganizationRoute.js` | `createOrganizationMemberCtrl` is implemented but omitted from route definitions. | **Medium** | Add `router.post("/:organizationId/members", verifyToken, createOrganizationMemberCtrl)`. |
| **BUG-04** | `routes/userRoute.js:22` | `uploadSingleImage` middleware passed as reference rather than executed factory call. | **High** | Change to `uploadSingleImage("profilePhoto")`. |
| **DEBT-01** | `models/auth/User.model.js:324` | Deprecated `generateAuthToken` method remains on User schema. | **Low** | Remove or add deprecation warning; code now strictly uses `token.utils.js`. |
| **DEBT-02** | `package.json:7` | Test script specifies `tests/*.test.js` while test files were removed/misplaced. | **Medium** | Create standard `tests/` directory with integration and unit tests. |
| **DEBT-03** | `app.js` & Controllers | Inconsistent console logging without log levels or timestamps. | **Medium** | Introduce Winston/Pino logger in Phase 5. |

---

## 9. Detailed Milestone Timeline

```
Q3 2026 (Completed)             Q4 2026 (Active)                Q1 2027 (Upcoming)
[Phase 1: Core Auth & Redis]    [Phase 2: Organization Domain]  [Phase 3: Workspaces & Projects]
├── Redis Client & Lua Scripts  ├── Work Domain Data Models     ├── Workspace Management APIs
├── Dual-Token (Access/Refresh) ├── Org Creation & Settings     ├── Project Engine & Keys
├── Server Sessions & Revoke    ├── [Sprint] Fix Member Ctrl    ├── WorkItem Kanban Engine
├── Distributed Rate Limiting   ├── [Sprint] Fix Upload Route   └── Epics & Milestones
├── BullMQ Queues & Workers     └── Org Invitation System
└── Multi-language i18n
```

---

*This document is continuously updated to reflect the true architectural and implementation state of the Mushrif Backend project.*
