-- ========================================================
-- ASSIGNMENT SUBMISSION PORTAL (MULTI-SUBJECT)
-- Complete Database Schema, Tables, Functions, and Storage RLS
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ========================================================

-- 1. Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    live_website_url TEXT,
    submission_ref TEXT NOT NULL UNIQUE,
    verification_code_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'rejected')),
    rejection_reason TEXT,
    rejected_at TIMESTAMPTZ,
    rejected_by TEXT,
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_submissions_roll ON public.submissions (roll_number);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_ref ON public.submissions (submission_ref);

-- 2. Create submission_files table (supports versioning)
CREATE TABLE IF NOT EXISTS public.submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    version INT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_submission_version UNIQUE (submission_id, version)
);

CREATE INDEX IF NOT EXISTS idx_submission_files_sub_id ON public.submission_files (submission_id);

-- 3. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('admin', 'instructor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create student_roster table (CS421: Compiler Construction class roster)
CREATE TABLE IF NOT EXISTS public.student_roster (
    roll_number TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Initial Instructor Roster for CS421
INSERT INTO public.student_roster (roll_number, student_name, email)
VALUES 
    ('FA21-BCS-001', 'Alexander Vance', 'avance@cs.edu'),
    ('FA21-BCS-014', 'Sophia Chen', 'schen@cs.edu'),
    ('FA21-BCS-028', 'Darius Miller', 'dmiller@cs.edu'),
    ('FA21-BCS-042', 'Elena Rostova', 'erostova@cs.edu'),
    ('FA21-BCS-056', 'Marcus Brody', 'mbrody@cs.edu'),
    ('FA21-BCS-070', 'Aaliyah Khan', 'akhan@cs.edu'),
    ('FA21-BCS-083', 'Tariq Al-Mansoor', 'talmansoor@cs.edu'),
    ('FA21-BCS-099', 'Lucas Lindqvist', 'llindqvist@cs.edu'),
    ('FA21-BCS-112', 'Chloe Davenport', 'cdavenport@cs.edu'),
    ('FA21-BCS-125', 'Rohan Sharma', 'rsharma@cs.edu')
ON CONFLICT (roll_number) DO NOTHING;

-- Seed default admin users
INSERT INTO public.admin_users (email, full_name, role)
VALUES 
    ('shahmproject@gmail.com', 'Administrator', 'admin'),
    ('instructor@compiler.edu', 'Prof. Alan Turing', 'instructor'),
    ('admin@compiler.edu', 'Systems Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin (rejects anonymous sessions)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jwt JSONB;
    v_email TEXT;
BEGIN
    v_jwt := (SELECT auth.jwt());
    IF v_jwt IS NULL THEN
        RETURN false;
    END IF;

    IF COALESCE(v_jwt ->> 'role', '') = 'service_role' THEN
        RETURN true;
    END IF;

    IF COALESCE((v_jwt ->> 'is_anonymous')::boolean, false) THEN
        RETURN false;
    END IF;

    IF (SELECT auth.uid()) IS NULL THEN
        RETURN false;
    END IF;

    v_email := lower(trim(COALESCE(v_jwt ->> 'email', '')));
    IF v_email = '' THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE lower(email) = v_email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Revoke direct anonymous privileges on sensitive tables (students use validated RPCs)
REVOKE ALL ON TABLE public.submissions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.submission_files FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.student_roster FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon;

-- RLS Policies for submissions (Admin only for direct table queries)
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow student insertions" ON public.submissions;
DROP POLICY IF EXISTS "Allow student resubmissions" ON public.submissions;
DROP POLICY IF EXISTS "Service role full access on submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admins manage submissions" ON public.submissions;
CREATE POLICY "Admins manage submissions"
    ON public.submissions
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- RLS Policies for submission_files
DROP POLICY IF EXISTS "Admins can view all submission files" ON public.submission_files;
DROP POLICY IF EXISTS "Allow student file record insertion" ON public.submission_files;
DROP POLICY IF EXISTS "Service role full access on submission_files" ON public.submission_files;
DROP POLICY IF EXISTS "Admins manage submission_files" ON public.submission_files;
CREATE POLICY "Admins manage submission_files"
    ON public.submission_files
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- RLS Policies for student_roster
DROP POLICY IF EXISTS "Admins can view roster" ON public.student_roster;
DROP POLICY IF EXISTS "Service role full access on student_roster" ON public.student_roster;
DROP POLICY IF EXISTS "Admins manage student_roster" ON public.student_roster;
CREATE POLICY "Admins manage student_roster"
    ON public.student_roster
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- RLS Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

-- Secure RPC: Check Submission Status without exposing private files, hashes, or empty-code bypass
CREATE OR REPLACE FUNCTION public.check_submission_secure(
    p_roll_number TEXT,
    p_code_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sub RECORD;
    v_roll TEXT;
    v_hash TEXT;
BEGIN
    v_roll := UPPER(TRIM(COALESCE(p_roll_number, '')));
    v_hash := lower(trim(COALESCE(p_code_hash, '')));

    IF v_roll = '' OR NOT EXISTS (SELECT 1 FROM public.submissions WHERE roll_number = v_roll) THEN
        RETURN json_build_object(
            'found', false,
            'status', 'unsubmitted',
            'message', 'Your assignment has not been submitted yet.'
        );
    END IF;

    IF v_hash !~ '^[a-f0-9]{64}$' THEN
        RETURN json_build_object(
            'found', true,
            'invalid_code', true,
            'message', 'Please enter the 4-digit verification code from your submission receipt.'
        );
    END IF;

    SELECT
        status,
        student_name,
        roll_number,
        submission_ref,
        current_version,
        created_at,
        rejection_reason,
        rejected_at
    INTO v_sub
    FROM public.submissions
    WHERE roll_number = v_roll
      AND verification_code_hash = v_hash;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'found', true,
            'invalid_code', true,
            'message', 'Verification code does not match this roll number.'
        );
    END IF;

    RETURN json_build_object(
        'found', true,
        'status', v_sub.status,
        'student_name', v_sub.student_name,
        'roll_number', v_sub.roll_number,
        'submission_ref', v_sub.submission_ref,
        'version', v_sub.current_version,
        'submitted_at', v_sub.created_at,
        'rejection_reason', v_sub.rejection_reason,
        'rejected_at', v_sub.rejected_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_submission_secure(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_submission_secure(TEXT, TEXT) TO anon, authenticated;

-- Storage Bucket: assignments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assignments',
    'assignments',
    false,
    15728640,
    ARRAY['application/pdf', 'application/x-pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf'];

-- Storage RLS: Allow PDF uploads only and admin-only reads (replaces deprecated auth.role())
DROP POLICY IF EXISTS "Allow student PDF uploads" ON storage.objects;
DROP POLICY IF EXISTS "Students upload assignment PDFs" ON storage.objects;
CREATE POLICY "Students upload assignment PDFs"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        bucket_id = 'assignments'
        AND name ~* '^[a-z0-9][a-z0-9._/-]*\.pdf$'
        AND position('..' in name) = 0
        AND position('//' in name) = 0
    );

DROP POLICY IF EXISTS "Admins can view and download assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Admins read assignment PDFs" ON storage.objects;
CREATE POLICY "Admins read assignment PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'assignments'
        AND (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "Service role full storage access" ON storage.objects;

-- Note: Also run supabase/multi_subject_setup.sql (or supabase/migrations/20261115000001_multi_subject_assignments.sql)
-- to enable multi-subject assignments and dynamic subject table creation.

