# Compiler Construction Assignment Submission Portal

A production-grade, secure academic assignment submission platform built for **CS421: Compiler Construction**. Engineered with React, TypeScript, Tailwind CSS, Three.js instanced rendering, and Supabase backend architecture (PostgreSQL, Private Encrypted Storage, Row Level Security, and Edge Functions).

---

## 1. Technology Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (Dark academic SaaS theme, glassmorphic panels)
- **Visuals:** Three.js / WebGL with Instanced Rendering (low CPU/GPU footprint, cursor-responsive repulsion wave)
- **Animations:** Framer Motion, Canvas Confetti
- **Backend & Database:** Supabase PostgreSQL
- **Storage:** Private Supabase Storage bucket (`assignments`) with signed 60-second URLs
- **Authentication:** Supabase Auth (Administrator & Instructor accounts)
- **Security Operations:** Supabase Edge Functions & PostgreSQL Row Level Security (RLS)

---

## 2. Exact Page Structure

The application strictly implements two routes:

| Route | View | Description |
|---|---|---|
| `/` | **Student Portal** | Contains two sections on the same page: <br>1. **Submit Assignment** (PDF upload, validation, duplicate prevention)<br>2. **Check Assignment Submission** (Real-time status checker & resubmission trigger) |
| `/admin` | **Administrator Portal** | Logged out: Secure administrator login.<br>Logged in: Real-time dashboard on the same route without redirecting. |

---

## 3. Security & Validation Architecture

### 1. Server-Grade Binary Header Validation (`%PDF-`)
Rather than relying solely on file extensions or untrusted client MIME headers, both the client and Supabase Edge Function perform binary inspection of the file slice to verify the `%PDF-` signature (`0x25 0x50 0x44 0x46 0x2D`) before storage. Disguised executables or renamed images are automatically rejected.

### 2. Private Storage Vault & Zero Public Exposure
Assignment PDFs are uploaded directly to a **private** Supabase storage bucket (`assignments`). The bucket does not allow public reads. Only authenticated administrators with verified instructor credentials can generate short-lived, 60-second signed stream and download URLs.

### 3. Duplicate Prevention & Automatic Versioning
- Students cannot accidentally submit duplicate assignments while an existing submission is active under `submitted` status.
- When an instructor **rejects** an assignment, the student is permitted to resubmit a corrected PDF.
- The platform automatically retains all previous versions (`v1`, `v2`, etc.) in the `submission_files` table rather than overwriting them, enabling instructors to review the revision history.

### 4. Secure Verification Mechanism
Unauthenticated users cannot browse the full database or access document URLs. The student checker takes the student's Roll Number and Private Verification Code, returning only the status (`submitted` / `rejected` / `not submitted`), submission reference, timestamp, and instructor notes.

---

## 4. Supabase Setup & Deployment Guide

### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** from `Project Settings > API`.

### Step 2: Run SQL Migrations
Navigate to the **SQL Editor** in your Supabase dashboard and run the migrations in order:

1. **Schema & Tables (`supabase/migrations/20261103000001_initial_schema.sql`):**
   - Creates `submissions`, `submission_files`, `admin_users`, and `student_roster` tables.
   - Sets up Row Level Security (RLS) policies.
   - Installs the secure RPC function `check_submission_secure`.
   - Seeds the default instructor roster for CS421.

2. **Storage Bucket Setup (`supabase/migrations/20261103000002_storage_setup.sql`):**
   - Creates the private storage bucket `assignments`.
   - Configures access policies allowing authenticated instructors to view and download files.

### Step 3: Deploy Supabase Edge Functions (Optional for Cloud Ops)
Deploy the functions using the Supabase CLI:

```bash
supabase functions deploy submit-assignment --no-verify-jwt
supabase functions deploy check-submission --no-verify-jwt
supabase functions deploy admin-actions
```

### Step 4: Configure Frontend Environment Variables
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

*Tip: You can also click the status pill at the bottom-left of the application to configure or update credentials directly through the interactive modal.*

---

## 5. End-to-End Workflow Verification

The application is thoroughly verified across the full 10-step lifecycle:

1. **Student Submits a PDF:** Student enters Name, Roll Number (e.g. `FA21-BCS-042`), and selects a valid PDF report. Client validates binary signature `%PDF-`.
2. **Submission Recorded:** Stored in PostgreSQL with unique reference `CC-2026-XXXXX` and generated private verification code.
3. **PDF Saved in Private Storage:** Archived under path `{roll_number}/v1_{timestamp}_{filename}` in the private `assignments` bucket.
4. **Student Checks Status:** Student inputs Roll Number in Section 2 ("Check Your Assignment Submission") and sees the green **Submitted** status badge.
5. **Admin Logs In:** Administrator visits `/admin` and logs in with `instructor@compiler.edu` / `admin123`.
6. **Admin Views/Downloads PDF:** Admin views the submission table, clicks **View PDF** (streamed via 60-second signed URL in the embedded viewer) or **Download PDF**.
7. **Admin Rejects Assignment:** Admin clicks **Reject**, types feedback notes (e.g. "Missing AST visualization"), and confirms. Status updates to `rejected` with timestamp and instructor attribution.
8. **Student Sees Rejection:** Student re-checks their roll number in Section 2, sees the red **Rejected** status with instructor feedback and a prominent **Submit Again** button.
9. **Student Uploads Corrected PDF:** Clicking **Submit Again** scrolls up to the form and pre-fills their details. Student uploads the corrected PDF (`v2`).
10. **Admin Accesses All Versions:** In the admin portal, the instructor opens the **Version History** modal to inspect and download both `v1` and `v2`.

---

## 6. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript typecheck and production build
npm run build
```

---

## 7. License & Credits

CS421: Compiler Construction • Academic Courseware Platform. Built with modern web security best practices.
