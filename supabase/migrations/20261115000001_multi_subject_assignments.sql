-- ============================================================================
-- ASSIGNMENT SUBMISSION PORTAL — MULTI-SUBJECT DYNAMIC TABLES MIGRATION
-- Safe & Idempotent: Preserves all existing rows in public.submissions & storage.
-- Run once in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- 1. Ensure is_admin() uses modern auth.jwt() best practices & pinned search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN (
        (SELECT auth.jwt() ->> 'role') = 'service_role'
        OR EXISTS (
            SELECT 1
            FROM public.admin_users
            WHERE lower(email) = lower(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
        )
    );
END;
$$;

-- 2. Registry table tracking all subjects, deadlines, and their dedicated tables
CREATE TABLE IF NOT EXISTS public.subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL UNIQUE,
    deadline TIMESTAMPTZ NOT NULL,
    created_by TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subject_assignments_table_name
    ON public.subject_assignments (table_name);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_deadline
    ON public.subject_assignments (deadline);

ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subject_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subject_assignments TO authenticated;

DROP POLICY IF EXISTS "Public can view active subject assignments" ON public.subject_assignments;
CREATE POLICY "Public can view active subject assignments"
    ON public.subject_assignments
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can manage subject assignments" ON public.subject_assignments;
CREATE POLICY "Admins can manage subject assignments"
    ON public.subject_assignments
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- 3. Seed existing Compiler Construction subject mapped to existing public.submissions
INSERT INTO public.subject_assignments (subject_name, table_name, deadline, created_by, is_active)
VALUES (
    'Compiler Construction',
    'submissions',
    TIMESTAMPTZ '2026-12-31 23:59:00+00',
    'shahmproject@gmail.com',
    true
)
ON CONFLICT (table_name) DO NOTHING;

-- 4. Internal helper to strictly allowlist subject table names against registry
CREATE OR REPLACE FUNCTION public._resolve_subject_table(p_table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
BEGIN
    v_table_name := trim(COALESCE(p_table_name, ''));
    IF v_table_name = '' THEN
        v_table_name := 'submissions';
    END IF;

    IF v_table_name <> 'submissions' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.subject_assignments sa
            WHERE sa.table_name = v_table_name
              AND sa.is_active = true
        ) THEN
            RAISE EXCEPTION 'Invalid or inactive subject table: %', v_table_name
                USING ERRCODE = '22023';
        END IF;
    END IF;

    IF to_regclass(format('public.%I', v_table_name)) IS NULL THEN
        RAISE EXCEPTION 'Subject submission table "%" does not exist.', v_table_name
            USING ERRCODE = '42P01';
    END IF;

    RETURN v_table_name;
END;
$$;

-- 5. Admin RPC: Create a new assignment AND dynamically create a Supabase table for that subject
CREATE OR REPLACE FUNCTION public.create_subject_assignment(
    p_subject_name TEXT,
    p_deadline TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_subject_name TEXT;
    v_slug TEXT;
    v_table_name TEXT;
    v_record public.subject_assignments%ROWTYPE;
    v_admin_email TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only authorized administrators can create subject assignments.'
            USING ERRCODE = '42501';
    END IF;

    v_subject_name := trim(regexp_replace(COALESCE(p_subject_name, ''), '\s+', ' ', 'g'));
    IF char_length(v_subject_name) < 2 OR char_length(v_subject_name) > 100 THEN
        RAISE EXCEPTION 'Subject name must be between 2 and 100 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF p_deadline IS NULL THEN
        RAISE EXCEPTION 'A valid submission deadline is required.'
            USING ERRCODE = '22023';
    END IF;

    -- Build a safe PostgreSQL table identifier from the subject name
    v_slug := regexp_replace(lower(v_subject_name), '[^a-z0-9]+', '_', 'g');
    v_slug := trim(both '_' FROM v_slug);

    IF v_slug = '' THEN
        RAISE EXCEPTION 'Subject name must include letters or numbers.'
            USING ERRCODE = '22023';
    END IF;

    IF left(v_slug, 1) ~ '[0-9]' THEN
        v_slug := 'subj_' || v_slug;
    END IF;

    v_table_name := rtrim(left(v_slug, 48), '_');

    -- Guard reserved database table names
    IF v_table_name IN (
        'submissions',
        'submission_files',
        'admin_users',
        'student_roster',
        'subject_assignments',
        'subjects',
        'assignments',
        'users',
        'profiles'
    ) THEN
        v_table_name := rtrim(left('subj_' || v_table_name, 48), '_');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.subject_assignments
        WHERE lower(subject_name) = lower(v_subject_name)
           OR table_name = v_table_name
    ) THEN
        RAISE EXCEPTION 'An assignment for subject "%" already exists.', v_subject_name
            USING ERRCODE = '23505';
    END IF;

    IF to_regclass(format('public.%I', v_table_name)) IS NOT NULL THEN
        RAISE EXCEPTION 'Table "public.%" already exists in Supabase.', v_table_name
            USING ERRCODE = '42P07';
    END IF;

    v_admin_email := COALESCE((SELECT auth.jwt() ->> 'email'), 'shahmproject@gmail.com');

    -- Register metadata in subject_assignments
    INSERT INTO public.subject_assignments (
        subject_name,
        table_name,
        deadline,
        created_by,
        is_active
    )
    VALUES (
        v_subject_name,
        v_table_name,
        p_deadline,
        v_admin_email,
        true
    )
    RETURNING * INTO v_record;

    -- Create the dedicated table named after the subject
    EXECUTE format(
        'CREATE TABLE public.%I (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            roll_number TEXT NOT NULL UNIQUE,
            student_name TEXT NOT NULL,
            live_website_url TEXT,
            submission_ref TEXT NOT NULL UNIQUE,
            verification_code_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT ''submitted'' CHECK (status IN (''submitted'', ''rejected'')),
            rejection_reason TEXT,
            rejected_at TIMESTAMPTZ,
            rejected_by TEXT,
            current_version INT NOT NULL DEFAULT 1,
            file_path TEXT,
            file_name TEXT,
            file_size BIGINT,
            files JSONB NOT NULL DEFAULT ''[]''::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now())
        )',
        v_table_name
    );

    EXECUTE format('CREATE INDEX %I ON public.%I (roll_number)', 'idx_' || v_table_name || '_roll', v_table_name);
    EXECUTE format('CREATE INDEX %I ON public.%I (status)', 'idx_' || v_table_name || '_status', v_table_name);
    EXECUTE format('CREATE INDEX %I ON public.%I (created_at DESC)', 'idx_' || v_table_name || '_created', v_table_name);

    -- Enable Row Level Security & Data API grants
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', v_table_name);
    EXECUTE format('GRANT INSERT, UPDATE ON public.%I TO anon', v_table_name);

    EXECUTE format(
        'CREATE POLICY "Admins can manage submissions" ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
        v_table_name
    );
    EXECUTE format(
        'CREATE POLICY "Allow student insertions" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (status = ''submitted'')',
        v_table_name
    );
    EXECUTE format(
        'CREATE POLICY "Allow student resubmissions" ON public.%I FOR UPDATE TO anon, authenticated USING (status = ''rejected'') WITH CHECK (status = ''submitted'')',
        v_table_name
    );

    -- Refresh PostgREST schema cache so the new table is immediately discoverable
    PERFORM pg_notify('pgrst', 'reload schema');

    RETURN row_to_json(v_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_subject_assignment(TEXT, TIMESTAMPTZ) TO authenticated;

-- 6. Safe duplicate pre-check RPC before uploading PDF to storage
CREATE OR REPLACE FUNCTION public.check_subject_roll_exists(
    p_table_name TEXT,
    p_roll_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_roll TEXT;
    v_status TEXT;
    v_version INT;
    v_ref TEXT;
BEGIN
    v_table_name := public._resolve_subject_table(p_table_name);
    v_roll := UPPER(TRIM(COALESCE(p_roll_number, '')));

    IF v_roll = '' THEN
        RETURN json_build_object('exists', false);
    END IF;

    EXECUTE format(
        'SELECT status, current_version, submission_ref FROM public.%I WHERE roll_number = $1 LIMIT 1',
        v_table_name
    )
    INTO v_status, v_version, v_ref
    USING v_roll;

    IF v_status IS NULL THEN
        RETURN json_build_object('exists', false);
    END IF;

    RETURN json_build_object(
        'exists', true,
        'status', v_status,
        'current_version', v_version,
        'submission_ref', v_ref
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_subject_roll_exists(TEXT, TEXT) TO anon, authenticated;

-- 7. Student submission & resubmission RPC for any subject table
CREATE OR REPLACE FUNCTION public.submit_to_subject_table(
    p_table_name TEXT,
    p_roll_number TEXT,
    p_student_name TEXT,
    p_live_website_url TEXT,
    p_submission_ref TEXT,
    p_code_hash TEXT,
    p_file_path TEXT,
    p_file_name TEXT,
    p_file_size BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_roll TEXT;
    v_student TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_existing_id UUID;
    v_existing_status TEXT;
    v_existing_version INT;
    v_existing_ref TEXT;
    v_version INT := 1;
    v_sub_id UUID;
    v_ref TEXT;
    v_file_obj JSONB;
BEGIN
    v_table_name := public._resolve_subject_table(p_table_name);
    v_roll := UPPER(TRIM(COALESCE(p_roll_number, '')));
    v_student := TRIM(COALESCE(p_student_name, ''));

    IF v_roll = '' OR v_student = '' OR COALESCE(p_file_path, '') = '' THEN
        RAISE EXCEPTION 'Missing required submission fields.'
            USING ERRCODE = '22023';
    END IF;

    IF v_table_name = 'submissions' THEN
        SELECT id, status, current_version, submission_ref
        INTO v_existing_id, v_existing_status, v_existing_version, v_existing_ref
        FROM public.submissions
        WHERE roll_number = v_roll;

        IF v_existing_id IS NOT NULL AND v_existing_status = 'submitted' THEN
            RAISE EXCEPTION 'Roll number % already has an active submission (%).', v_roll, v_existing_ref
                USING ERRCODE = '23505';
        END IF;

        IF v_existing_id IS NOT NULL THEN
            v_version := v_existing_version + 1;
            v_sub_id := v_existing_id;
            v_ref := v_existing_ref;

            UPDATE public.submissions
            SET student_name = v_student,
                live_website_url = NULLIF(TRIM(COALESCE(p_live_website_url, '')), ''),
                status = 'submitted',
                rejection_reason = NULL,
                rejected_at = NULL,
                rejected_by = NULL,
                current_version = v_version,
                verification_code_hash = p_code_hash,
                updated_at = v_now
            WHERE id = v_sub_id;
        ELSE
            v_version := 1;
            v_ref := p_submission_ref;

            INSERT INTO public.submissions (
                roll_number,
                student_name,
                live_website_url,
                submission_ref,
                verification_code_hash,
                status,
                current_version,
                created_at,
                updated_at
            )
            VALUES (
                v_roll,
                v_student,
                NULLIF(TRIM(COALESCE(p_live_website_url, '')), ''),
                v_ref,
                p_code_hash,
                'submitted',
                1,
                v_now,
                v_now
            )
            RETURNING id INTO v_sub_id;
        END IF;

        INSERT INTO public.submission_files (
            submission_id,
            version,
            file_path,
            file_name,
            file_size,
            mime_type,
            uploaded_at
        )
        VALUES (
            v_sub_id,
            v_version,
            p_file_path,
            p_file_name,
            p_file_size,
            'application/pdf',
            v_now
        );
    ELSE
        EXECUTE format(
            'SELECT id, status, current_version, submission_ref FROM public.%I WHERE roll_number = $1 LIMIT 1',
            v_table_name
        )
        INTO v_existing_id, v_existing_status, v_existing_version, v_existing_ref
        USING v_roll;

        IF v_existing_id IS NOT NULL AND v_existing_status = 'submitted' THEN
            RAISE EXCEPTION 'Roll number % already has an active submission (%).', v_roll, v_existing_ref
                USING ERRCODE = '23505';
        END IF;

        IF v_existing_id IS NOT NULL THEN
            v_version := v_existing_version + 1;
            v_sub_id := v_existing_id;
            v_ref := v_existing_ref;
        ELSE
            v_version := 1;
            v_sub_id := gen_random_uuid();
            v_ref := p_submission_ref;
        END IF;

        v_file_obj := jsonb_build_object(
            'id', gen_random_uuid()::text,
            'submission_id', v_sub_id::text,
            'version', v_version,
            'file_path', p_file_path,
            'file_name', p_file_name,
            'file_size', p_file_size,
            'mime_type', 'application/pdf',
            'uploaded_at', v_now
        );

        IF v_existing_id IS NOT NULL THEN
            EXECUTE format(
                'UPDATE public.%I
                 SET student_name = $1,
                     live_website_url = $2,
                     status = ''submitted'',
                     rejection_reason = NULL,
                     rejected_at = NULL,
                     rejected_by = NULL,
                     current_version = $3,
                     verification_code_hash = $4,
                     file_path = $5,
                     file_name = $6,
                     file_size = $7,
                     files = COALESCE(files, ''[]''::jsonb) || jsonb_build_array($8),
                     updated_at = $9
                 WHERE id = $10',
                v_table_name
            )
            USING v_student,
                  NULLIF(TRIM(COALESCE(p_live_website_url, '')), ''),
                  v_version,
                  p_code_hash,
                  p_file_path,
                  p_file_name,
                  p_file_size,
                  v_file_obj,
                  v_now,
                  v_sub_id;
        ELSE
            EXECUTE format(
                'INSERT INTO public.%I (
                    id,
                    roll_number,
                    student_name,
                    live_website_url,
                    submission_ref,
                    verification_code_hash,
                    status,
                    current_version,
                    file_path,
                    file_name,
                    file_size,
                    files,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, ''submitted'', 1, $7, $8, $9, jsonb_build_array($10), $11, $11)',
                v_table_name
            )
            USING v_sub_id,
                  v_roll,
                  v_student,
                  NULLIF(TRIM(COALESCE(p_live_website_url, '')), ''),
                  v_ref,
                  p_code_hash,
                  p_file_path,
                  p_file_name,
                  p_file_size,
                  v_file_obj,
                  v_now;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'submission_id', v_sub_id,
        'submission_ref', v_ref,
        'version', v_version,
        'submitted_at', v_now,
        'is_resubmission', (v_version > 1)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_to_subject_table(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated;

-- 8. Secure verification-code status checker RPC for any subject table
CREATE OR REPLACE FUNCTION public.check_subject_submission_secure(
    p_table_name TEXT,
    p_roll_number TEXT,
    p_code_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_roll TEXT;
    v_status TEXT;
    v_student_name TEXT;
    v_roll_out TEXT;
    v_submission_ref TEXT;
    v_current_version INT;
    v_created_at TIMESTAMPTZ;
    v_rejection_reason TEXT;
    v_rejected_at TIMESTAMPTZ;
    v_exists BOOLEAN := false;
BEGIN
    v_table_name := public._resolve_subject_table(p_table_name);
    v_roll := UPPER(TRIM(COALESCE(p_roll_number, '')));

    EXECUTE format(
        'SELECT status, student_name, roll_number, submission_ref, current_version, created_at, rejection_reason, rejected_at
         FROM public.%I
         WHERE roll_number = $1
           AND verification_code_hash = $2
         LIMIT 1',
        v_table_name
    )
    INTO v_status, v_student_name, v_roll_out, v_submission_ref, v_current_version, v_created_at, v_rejection_reason, v_rejected_at
    USING v_roll, COALESCE(p_code_hash, '');

    IF v_status IS NULL THEN
        EXECUTE format(
            'SELECT EXISTS(SELECT 1 FROM public.%I WHERE roll_number = $1)',
            v_table_name
        )
        INTO v_exists
        USING v_roll;

        IF v_exists THEN
            RETURN json_build_object(
                'found', true,
                'invalid_code', true,
                'message', 'Verification code does not match this roll number.'
            );
        ELSE
            RETURN json_build_object(
                'found', false,
                'status', 'unsubmitted',
                'message', 'Your assignment has not been submitted yet for this subject.'
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'found', true,
        'status', v_status,
        'student_name', v_student_name,
        'roll_number', v_roll_out,
        'submission_ref', v_submission_ref,
        'version', v_current_version,
        'submitted_at', v_created_at,
        'rejection_reason', v_rejection_reason,
        'rejected_at', v_rejected_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_subject_submission_secure(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 9. Admin RPC: Fetch submissions for any subject table
CREATE OR REPLACE FUNCTION public.get_subject_submissions(p_table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Administrator access required.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := public._resolve_subject_table(p_table_name);

    IF v_table_name = 'submissions' THEN
        SELECT COALESCE(
            jsonb_agg(row_data ORDER BY (row_data ->> 'created_at') DESC),
            '[]'::jsonb
        )
        INTO v_result
        FROM (
            SELECT
                (to_jsonb(s) - 'verification_code_hash') ||
                jsonb_build_object(
                    'files',
                    COALESCE(
                        (
                            SELECT jsonb_agg(to_jsonb(f) ORDER BY f.version DESC)
                            FROM public.submission_files f
                            WHERE f.submission_id = s.id
                        ),
                        '[]'::jsonb
                    )
                ) AS row_data
            FROM public.submissions s
        ) sub;
    ELSE
        EXECUTE format(
            'SELECT COALESCE(
                jsonb_agg((to_jsonb(t) - ''verification_code_hash'') ORDER BY t.created_at DESC),
                ''[]''::jsonb
            )
            FROM public.%I t',
            v_table_name
        )
        INTO v_result;
    END IF;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subject_submissions(TEXT) TO authenticated;

-- 10. Admin RPC: Reject a submission inside any subject table
CREATE OR REPLACE FUNCTION public.reject_subject_submission(
    p_table_name TEXT,
    p_submission_id UUID,
    p_reason TEXT,
    p_rejected_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_reason TEXT;
    v_admin TEXT;
    v_updated JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Administrator access required.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := public._resolve_subject_table(p_table_name);
    v_reason := COALESCE(
        NULLIF(trim(p_reason), ''),
        'Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.'
    );
    v_admin := COALESCE(NULLIF(trim(p_rejected_by), ''), (SELECT auth.jwt() ->> 'email'), 'Administrator');

    IF v_table_name = 'submissions' THEN
        UPDATE public.submissions
        SET status = 'rejected',
            rejection_reason = v_reason,
            rejected_at = v_now,
            rejected_by = v_admin,
            updated_at = v_now
        WHERE id = p_submission_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Submission record not found.'
                USING ERRCODE = 'P0002';
        END IF;

        SELECT
            (to_jsonb(s) - 'verification_code_hash') ||
            jsonb_build_object(
                'files',
                COALESCE(
                    (
                        SELECT jsonb_agg(to_jsonb(f) ORDER BY f.version DESC)
                        FROM public.submission_files f
                        WHERE f.submission_id = s.id
                    ),
                    '[]'::jsonb
                )
            )
        INTO v_updated
        FROM public.submissions s
        WHERE s.id = p_submission_id;
    ELSE
        EXECUTE format(
            'UPDATE public.%I AS t
             SET status = ''rejected'',
                 rejection_reason = $1,
                 rejected_at = $2,
                 rejected_by = $3,
                 updated_at = $2
             WHERE t.id = $4
             RETURNING (to_jsonb(t) - ''verification_code_hash'')',
            v_table_name
        )
        INTO v_updated
        USING v_reason, v_now, v_admin, p_submission_id;

        IF v_updated IS NULL THEN
            RAISE EXCEPTION 'Submission record not found.'
                USING ERRCODE = 'P0002';
        END IF;
    END IF;

    RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_subject_submission(TEXT, UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
