-- ========================================================
-- CS421: COMPILER CONSTRUCTION ASSIGNMENT SUBMISSION PORTAL
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
    ('instructor@compiler.edu', 'Prof. Alan Turing', 'instructor'),
    ('admin@compiler.edu', 'Systems Administrator', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE email = auth.jwt() ->> 'email'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
CREATE POLICY "Admins can view all submissions"
    ON public.submissions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update submissions" ON public.submissions;
CREATE POLICY "Admins can update submissions"
    ON public.submissions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow student insertions" ON public.submissions;
CREATE POLICY "Allow student insertions"
    ON public.submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow student resubmissions" ON public.submissions;
CREATE POLICY "Allow student resubmissions"
    ON public.submissions
    FOR UPDATE
    TO anon, authenticated
    USING (status = 'rejected')
    WITH CHECK (status = 'submitted');

DROP POLICY IF EXISTS "Service role full access on submissions" ON public.submissions;
CREATE POLICY "Service role full access on submissions"
    ON public.submissions
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for submission_files
DROP POLICY IF EXISTS "Admins can view all submission files" ON public.submission_files;
CREATE POLICY "Admins can view all submission files"
    ON public.submission_files
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Allow student file record insertion" ON public.submission_files;
CREATE POLICY "Allow student file record insertion"
    ON public.submission_files
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on submission_files" ON public.submission_files;
CREATE POLICY "Service role full access on submission_files"
    ON public.submission_files
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for student_roster
DROP POLICY IF EXISTS "Admins can view roster" ON public.student_roster;
CREATE POLICY "Admins can view roster"
    ON public.student_roster
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Service role full access on student_roster" ON public.student_roster;
CREATE POLICY "Service role full access on student_roster"
    ON public.student_roster
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Secure RPC: Check Submission Status without exposing private files or URLs
CREATE OR REPLACE FUNCTION public.check_submission_secure(
    p_roll_number TEXT,
    p_code_hash TEXT
)
RETURNS JSON AS $$
DECLARE
    v_sub RECORD;
BEGIN
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
    WHERE roll_number = UPPER(TRIM(p_roll_number))
      AND (verification_code_hash = p_code_hash OR p_code_hash = '');

    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.submissions WHERE roll_number = UPPER(TRIM(p_roll_number))) THEN
            RETURN json_build_object(
                'found', true,
                'invalid_code', true,
                'message', 'Verification code does not match this roll number.'
            );
        ELSE
            RETURN json_build_object(
                'found', false,
                'status', 'unsubmitted',
                'message', 'Your assignment has not been submitted yet.'
            );
        END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Storage RLS: Allow uploads and admin downloads
DROP POLICY IF EXISTS "Allow student PDF uploads" ON storage.objects;
CREATE POLICY "Allow student PDF uploads"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'assignments');

DROP POLICY IF EXISTS "Admins can view and download assignment files" ON storage.objects;
CREATE POLICY "Admins can view and download assignment files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'assignments' AND
        (
            auth.role() = 'service_role' OR
            EXISTS (
                SELECT 1 FROM public.admin_users
                WHERE email = auth.jwt() ->> 'email'
            )
        )
    );

DROP POLICY IF EXISTS "Service role full storage access" ON storage.objects;
CREATE POLICY "Service role full storage access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'assignments')
    WITH CHECK (bucket_id = 'assignments');

