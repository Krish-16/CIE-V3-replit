# Changelog

All notable changes to this project will be documented in this file.

This project follows a lightweight Keep a Changelog style. Dates are in YYYY-MM-DD.

## [Unreleased]
- Further Phase 1 UX polish, bulk operations, and SSE refinements.
- Phase 2 analytics and reporting groundwork.

## 2025-08-24 — Phase 1 Admin Dashboard UX & Bulk Ops

### Frontend
- Admin routing uses role-based protection with `PrivateRoute` for Admin/Faculty/Student dashboards.
- Introduced a unified API service layer.
  - File: `login-system/src/services/api.js`
  - Examples: `adminAPI.createStudent()`, `adminAPI.deleteStudent()`, Subjects CRUD.
- Dashboard: Live stats and recent audit logs with SSE subscription.
  - Files: `login-system/src/pages/AdminDashboard/DashboardHome.jsx`
  - Fetches `/admin/stats`, subscribes to SSE for live refresh.
- Import/Export UX overhaul across Admin pages.
  - Removed "Actions" dropdown.
  - New Import modal with drag & drop, file picker, template download, and inline SSE-driven progress bar.
- Standardized destructive action styling with `.btnDanger` and consistent layout across pages.

#### Students
- Create: Implemented manual creation via form with validation.
  - Always show Student ID field; validate SID + password in create mode.
  - File: `login-system/src/pages/AdminDashboard/ManageStudents.jsx`
  - API: `adminAPI.createStudent(data)`
- Update: Support editing `admissionYear` and `rollNumber`.
- Delete: Added Delete button next to Update/Cancel; wired to API.
- UI alignment: Adopted shared Admin styles (`formWrapper`, `inputStyle`, `tableContainer`, `thead`, 7-column grid).

#### Faculties & Subjects
- Faculties: Added red Delete button in edit mode; wired to backend via `adminAPI`.
- Subjects: Refactored to use backend API for fetch/create/update/delete with payload `{ name, classId }`.
  - Added red Delete button with API-backed handler.

#### Classes
- Form updates:
  - Removed manual `Class ID` input.
  - Replaced "Year" with `Term` (`termYear`).
  - Added `Odd/Even` selector and dependent `Semester (1–8)` dropdown.
  - Persist selected Term across add/update/delete/reset.
  - File: `login-system/src/pages/AdminDashboard/ManageClasses.jsx`

### Backend
- Admin stats and live updates:
  - Added/extended `/admin/stats` to return `totalDepartments`, `totalClasses`, `totalExams`, `activeExams`, `completedExams`.
  - Files: `backend/routes/admin.js`, `backend/models/Exam.js` (Exam model added).
  - Audit logs recorded on key admin actions; SSE used by frontend for live refresh and import progress.

#### Students
- `POST /admin/students` for manual creation with Zod validation.
  - Hash passwords, uppercase department, derive `currentYear` from `admissionYear`.
  - 409 on duplicate `studentId`.
  - Audit log on success.
- `PUT /admin/students/:id` allows `admissionYear`, `rollNumber`; 409 on duplicate `studentId`.
- `DELETE /admin/students/:id` with `adminOnly` and audit logging.

#### Faculties & Subjects
- Backed faculties deletion and subjects CRUD for `{ name, classId }` through `backend/routes/admin.js`.

#### Classes
- Auto-generate `classId` from department + className + semester.
- Enforce uniqueness and odd/even parity validation.
- Zod schemas `createClassSchema`/`updateClassSchema` accept `termYear`, `oddEven`, `semester`.
  - Use `z.coerce.number()` for `semester` to accept string/number.

#### Import Templates
- Updated student and faculty templates to require "Department ID" instead of department name.

### Files/Paths Referenced
- Backend routes: `backend/routes/admin.js`
- Backend middleware: `backend/middleware/*`
- Backend models: `backend/models/*` (includes `Exam.js`, `Student.js`, etc.)
- Frontend pages: `login-system/src/pages/AdminDashboard/*`
- Frontend API: `login-system/src/services/api.js`

---

Notes:
- Current focus remains Phase 1: UX enhancements, bulk operations, drag & drop imports with SSE progress, consistent UI, and safe delete actions.
- Phase 2 will add analytics/reporting (PDF/Excel exports, performance metrics).
