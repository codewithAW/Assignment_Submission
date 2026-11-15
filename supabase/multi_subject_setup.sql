-- ============================================================================
-- ASSIGNMENT SUBMISSION PORTAL — MULTI-SUBJECT DYNAMIC TABLES MIGRATION
-- Safe & Idempotent: Preserves all existing rows in public.submissions & storage.
-- Run once in Supabase Dashboard: SQL Editor -> New Query -> Paste & Run
-- ============================================================================

-- 1. Ensure is_admin() uses modern auth.jwt(), pinned search_path, and rejects anonymous JWTs
CREATE OR REPLACE FUNCTION public._sanitize_portal_text(p_input TEXT, p_max_len INT DEFAULT 200)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    v_clean := COALESCE(p_input, '');
    v_clean := translate(v_clean, U&'\200E\200F\202A\202B\202C\202D\202E\2066\2067\2068\2069', '');
    v_clean := regexp_replace(v_clean, '[[:cntrl:]]+', ' ', 'g');
    v_clean := trim(regexp_replace(v_clean, '\s+', ' ', 'g'));
    IF p_max_len > 0 AND char_length(v_clean) > p_max_len THEN
        v_clean := left(v_clean, p_max_len);
    END IF;
    RETURN v_clean;
END;
$$;

REVOKE ALL ON FUNCTION public._sanitize_portal_text(TEXT, INT) FROM PUBLIC, anon, authenticated;

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
        SELECT 1
        FROM public.admin_users
        WHERE lower(email) = v_email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.verification_attempts (
    table_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (table_name, roll_number)
);
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.verification_attempts FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Admins view verification attempts" ON public.verification_attempts;
CREATE POLICY "Admins view verification attempts"
    ON public.verification_attempts
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

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

    IF v_table_name !~ '^[a-z][a-z0-9_]{0,47}$' THEN
        RAISE EXCEPTION 'Invalid subject table identifier.'
            USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public._resolve_subject_table(TEXT) FROM PUBLIC, anon, authenticated;

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

    -- Enable strict Row Level Security (students interact via SECURITY DEFINER RPCs only)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', v_table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', v_table_name);

    EXECUTE format(
        'CREATE POLICY "Admins can manage submissions" ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
        v_table_name
    );

    -- Refresh PostgREST schema cache so the new table is immediately discoverable
    PERFORM pg_notify('pgrst', 'reload schema');

    RETURN row_to_json(v_record);
END;
$$;

REVOKE ALL ON FUNCTION public.create_subject_assignment(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
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

-- 7. Student submission & resubmission RPC for any subject table (hardened validation)
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
    v_live_url TEXT;
    v_ref_in TEXT;
    v_code_hash TEXT;
    v_file_path TEXT;
    v_file_name TEXT;
    v_expected_prefix TEXT;
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
    v_roll := UPPER(public._sanitize_portal_text(p_roll_number, 25));
    v_student := public._sanitize_portal_text(p_student_name, 120);
    v_live_url := NULLIF(public._sanitize_portal_text(p_live_website_url, 2048), '');
    v_ref_in := UPPER(public._sanitize_portal_text(p_submission_ref, 32));
    v_code_hash := lower(trim(COALESCE(p_code_hash, '')));
    v_file_path := trim(COALESCE(p_file_path, ''));
    v_file_name := replace(replace(public._sanitize_portal_text(p_file_name, 255), '/', '_'), '\', '_');

    IF v_roll !~ '^[A-Z0-9]+([-_/][A-Z0-9]+)*$' OR char_length(v_roll) < 4 OR char_length(v_roll) > 25 THEN
        RAISE EXCEPTION 'Invalid roll number format.'
            USING ERRCODE = '22023';
    END IF;

    IF char_length(v_student) < 2 THEN
        RAISE EXCEPTION 'Student name must be between 2 and 120 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF v_live_url IS NOT NULL THEN
        IF v_live_url ~ '\s' OR v_live_url !~* '^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:[0-9]{1,5})?([/?#].*)?$' THEN
            RAISE EXCEPTION 'Live website URL must start with http:// or https:// and contain a valid host.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    IF v_code_hash !~ '^[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'Invalid verification hash format.'
            USING ERRCODE = '22023';
    END IF;

    IF v_ref_in !~ '^(SUB|CC)-[0-9]{4}-[A-Z0-9]{4,12}$' THEN
        RAISE EXCEPTION 'Invalid submission reference format.'
            USING ERRCODE = '22023';
    END IF;

    v_expected_prefix := CASE
        WHEN v_table_name = 'submissions' THEN v_roll || '/'
        ELSE v_table_name || '/' || v_roll || '/'
    END;

    IF position('..' in v_file_path) > 0
       OR position('//' in v_file_path) > 0
       OR left(v_file_path, length(v_expected_prefix)) <> v_expected_prefix
       OR v_file_path !~* '^[a-z0-9][a-z0-9._/-]*\.pdf$' THEN
        RAISE EXCEPTION 'Invalid storage file path.'
            USING ERRCODE = '22023';
    END IF;

    IF v_file_name = '' OR lower(right(v_file_name, 4)) <> '.pdf' THEN
        RAISE EXCEPTION 'Only PDF filenames are accepted.'
            USING ERRCODE = '22023';
    END IF;

    IF p_file_size IS NULL OR p_file_size < 100 OR p_file_size > 15728640 THEN
        RAISE EXCEPTION 'PDF file size must be between 100 bytes and 15 MB.'
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
                live_website_url = v_live_url,
                status = 'submitted',
                rejection_reason = NULL,
                rejected_at = NULL,
                rejected_by = NULL,
                current_version = v_version,
                verification_code_hash = v_code_hash,
                updated_at = v_now
            WHERE id = v_sub_id;
        ELSE
            v_version := 1;
            v_ref := v_ref_in;

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
                v_live_url,
                v_ref,
                v_code_hash,
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
            v_file_path,
            v_file_name,
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
            v_ref := v_ref_in;
        END IF;

        v_file_obj := jsonb_build_object(
            'id', gen_random_uuid()::text,
            'submission_id', v_sub_id::text,
            'version', v_version,
            'file_path', v_file_path,
            'file_name', v_file_name,
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
                  v_live_url,
                  v_version,
                  v_code_hash,
                  v_file_path,
                  v_file_name,
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
                  v_live_url,
                  v_ref,
                  v_code_hash,
                  v_file_path,
                  v_file_name,
                  p_file_size,
                  v_file_obj,
                  v_now;
        END IF;
    END IF;

    DELETE FROM public.verification_attempts
    WHERE table_name = v_table_name AND roll_number = v_roll;

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

REVOKE ALL ON FUNCTION public.submit_to_subject_table(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_to_subject_table(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated;

-- 8. Secure verification-code status checker RPC with brute-force throttling
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
    v_hash TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_failed_attempts INT := 0;
    v_locked_until TIMESTAMPTZ;
    v_new_attempts INT := 0;
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
    v_roll := UPPER(public._sanitize_portal_text(p_roll_number, 25));
    v_hash := lower(trim(COALESCE(p_code_hash, '')));

    IF v_roll = '' OR v_roll !~ '^[A-Z0-9]+([-_/][A-Z0-9]+)*$' THEN
        RETURN json_build_object(
            'found', false,
            'status', 'unsubmitted',
            'message', 'Your assignment has not been submitted yet for this subject.'
        );
    END IF;

    SELECT failed_attempts, locked_until
    INTO v_failed_attempts, v_locked_until
    FROM public.verification_attempts
    WHERE table_name = v_table_name AND roll_number = v_roll;

    IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
        RETURN json_build_object(
            'found', true,
            'invalid_code', true,
            'locked', true,
            'message', 'Too many failed verification attempts. Please wait 15 minutes before trying again.'
        );
    END IF;

    EXECUTE format(
        'SELECT EXISTS(SELECT 1 FROM public.%I WHERE roll_number = $1)',
        v_table_name
    )
    INTO v_exists
    USING v_roll;

    IF NOT v_exists THEN
        RETURN json_build_object(
            'found', false,
            'status', 'unsubmitted',
            'message', 'Your assignment has not been submitted yet for this subject.'
        );
    END IF;

    IF v_hash !~ '^[a-f0-9]{64}$' THEN
        RETURN json_build_object(
            'found', true,
            'invalid_code', true,
            'message', 'Please enter the 4-digit verification code from your submission receipt.'
        );
    END IF;

    EXECUTE format(
        'SELECT status, student_name, roll_number, submission_ref, current_version, created_at, rejection_reason, rejected_at
         FROM public.%I
         WHERE roll_number = $1
           AND verification_code_hash = $2
         LIMIT 1',
        v_table_name
    )
    INTO v_status, v_student_name, v_roll_out, v_submission_ref, v_current_version, v_created_at, v_rejection_reason, v_rejected_at
    USING v_roll, v_hash;

    IF v_status IS NULL THEN
        INSERT INTO public.verification_attempts (table_name, roll_number, failed_attempts, locked_until, last_attempt_at)
        VALUES (v_table_name, v_roll, 1, NULL, v_now)
        ON CONFLICT (table_name, roll_number) DO UPDATE
        SET failed_attempts = CASE
                WHEN verification_attempts.locked_until IS NOT NULL AND verification_attempts.locked_until <= v_now THEN 1
                ELSE verification_attempts.failed_attempts + 1
            END,
            locked_until = CASE
                WHEN (
                    CASE
                        WHEN verification_attempts.locked_until IS NOT NULL AND verification_attempts.locked_until <= v_now THEN 1
                        ELSE verification_attempts.failed_attempts + 1
                    END
                ) >= 5 THEN v_now + interval '15 minutes'
                ELSE NULL
            END,
            last_attempt_at = v_now
        RETURNING failed_attempts INTO v_new_attempts;

        IF v_new_attempts >= 5 THEN
            RETURN json_build_object(
                'found', true,
                'invalid_code', true,
                'locked', true,
                'message', 'Too many failed verification attempts. Lookup locked for 15 minutes.'
            );
        END IF;

        RETURN json_build_object(
            'found', true,
            'invalid_code', true,
            'message', format('Verification code does not match this roll number (%s attempts remaining).', 5 - v_new_attempts)
        );
    END IF;

    DELETE FROM public.verification_attempts
    WHERE table_name = v_table_name AND roll_number = v_roll;

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

REVOKE ALL ON FUNCTION public.check_subject_submission_secure(TEXT, TEXT, TEXT) FROM PUBLIC;
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

REVOKE ALL ON FUNCTION public.get_subject_submissions(TEXT) FROM PUBLIC, anon;
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
        NULLIF(public._sanitize_portal_text(p_reason, 1000), ''),
        'Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.'
    );
    v_admin := COALESCE(
        NULLIF(trim(COALESCE((SELECT auth.jwt() ->> 'email'), '')), ''),
        NULLIF(public._sanitize_portal_text(p_rejected_by, 120), ''),
        'Administrator'
    );

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

REVOKE ALL ON FUNCTION public.reject_subject_submission(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_subject_submission(TEXT, UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
