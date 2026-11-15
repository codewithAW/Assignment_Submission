-- ============================================================================
-- ASSIGNMENT SUBMISSION PORTAL — CLOSE ASSIGNMENT, 24H TIMER & REVERT SETUP
-- Safe & Idempotent: Preserves all existing subjects, submissions, and files.
-- Run once in Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- ============================================================================

-- 0. Ensure helper sanitization function exists independently
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

-- 1. Track closure timestamp on subject assignments
ALTER TABLE public.subject_assignments
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_subject_assignments_closed_at
    ON public.subject_assignments (closed_at)
    WHERE closed_at IS NOT NULL;

-- Ensure default subject row exists if Submissions table was created before registry
INSERT INTO public.subject_assignments (subject_name, table_name, deadline, created_by, is_active)
VALUES (
    'Compiler Construction',
    'submissions',
    TIMESTAMPTZ '2026-12-31 23:59:00+00',
    'shahmproject@gmail.com',
    true
)
ON CONFLICT (table_name) DO NOTHING;

-- 2. Admin RPC: Close an active subject assignment (starts server-truth 24h visibility timer)
CREATE OR REPLACE FUNCTION public.close_subject_assignment(p_table_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_updated JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only authorized administrators can close subject assignments.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := public._resolve_subject_table(p_table_name);

    UPDATE public.subject_assignments
    SET closed_at = COALESCE(closed_at, v_now),
        updated_at = v_now
    WHERE table_name = v_table_name
    RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;

    IF v_updated IS NULL AND v_table_name = 'submissions' THEN
        INSERT INTO public.subject_assignments (subject_name, table_name, deadline, created_by, is_active, closed_at, updated_at)
        VALUES (
            'Compiler Construction',
            'submissions',
            TIMESTAMPTZ '2026-12-31 23:59:00+00',
            COALESCE((SELECT auth.jwt() ->> 'email'), 'shahmproject@gmail.com'),
            true,
            v_now,
            v_now
        )
        ON CONFLICT (table_name) DO UPDATE
            SET closed_at = COALESCE(public.subject_assignments.closed_at, v_now),
                updated_at = v_now
        RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;
    END IF;

    IF v_updated IS NULL THEN
        RAISE EXCEPTION 'Subject assignment "%" not found.', v_table_name
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.close_subject_assignment(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_subject_assignment(TEXT) TO authenticated;

-- 3. Admin RPC: Revert a closed subject assignment so students can submit again immediately
CREATE OR REPLACE FUNCTION public.revert_subject_assignment(p_table_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_updated JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only authorized administrators can revert subject assignments.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := public._resolve_subject_table(p_table_name);

    UPDATE public.subject_assignments
    SET closed_at = NULL,
        is_active = true,
        updated_at = v_now
    WHERE table_name = v_table_name
    RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;

    IF v_updated IS NULL AND v_table_name = 'submissions' THEN
        INSERT INTO public.subject_assignments (subject_name, table_name, deadline, created_by, is_active, closed_at, updated_at)
        VALUES (
            'Compiler Construction',
            'submissions',
            TIMESTAMPTZ '2026-12-31 23:59:00+00',
            COALESCE((SELECT auth.jwt() ->> 'email'), 'shahmproject@gmail.com'),
            true,
            NULL,
            v_now
        )
        ON CONFLICT (table_name) DO UPDATE
            SET closed_at = NULL,
                is_active = true,
                updated_at = v_now
        RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;
    END IF;

    IF v_updated IS NULL THEN
        RAISE EXCEPTION 'Subject assignment "%" not found.', v_table_name
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.revert_subject_assignment(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_subject_assignment(TEXT) TO authenticated;

-- 4. Enforce closed_at guard at database boundary inside submit_to_subject_table()
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
    v_closed_at TIMESTAMPTZ;
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

    SELECT sa.closed_at
    INTO v_closed_at
    FROM public.subject_assignments sa
    WHERE sa.table_name = v_table_name
      AND sa.is_active = true
    LIMIT 1;

    IF v_closed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Assignment deadline passed. Submissions for this subject are closed.'
            USING ERRCODE = '42501';
    END IF;

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

    IF to_regclass('public.verification_attempts') IS NOT NULL THEN
        DELETE FROM public.verification_attempts
        WHERE table_name = v_table_name AND roll_number = v_roll;
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

REVOKE ALL ON FUNCTION public.submit_to_subject_table(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_to_subject_table(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO anon, authenticated;

-- 5. Admin RPCs: Edit assignment name/deadline & permanently delete assignment
CREATE OR REPLACE FUNCTION public.update_subject_assignment(
    p_table_name TEXT,
    p_subject_name TEXT,
    p_deadline TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_subject_name TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_updated JSON;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only authorized administrators can update subject assignments.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := public._resolve_subject_table(p_table_name);
    v_subject_name := public._sanitize_portal_text(p_subject_name, 100);

    IF char_length(v_subject_name) < 2 OR char_length(v_subject_name) > 100 THEN
        RAISE EXCEPTION 'Subject name must be between 2 and 100 characters.'
            USING ERRCODE = '22023';
    END IF;

    IF p_deadline IS NULL THEN
        RAISE EXCEPTION 'A valid submission deadline is required.'
            USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.subject_assignments sa
        WHERE lower(sa.subject_name) = lower(v_subject_name)
          AND sa.table_name <> v_table_name
    ) THEN
        RAISE EXCEPTION 'An assignment for subject "%" already exists.', v_subject_name
            USING ERRCODE = '23505';
    END IF;

    UPDATE public.subject_assignments
    SET subject_name = v_subject_name,
        deadline = p_deadline,
        updated_at = v_now
    WHERE table_name = v_table_name
    RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;

    IF v_updated IS NULL AND v_table_name = 'submissions' THEN
        INSERT INTO public.subject_assignments (subject_name, table_name, deadline, created_by, is_active, updated_at)
        VALUES (
            v_subject_name,
            'submissions',
            p_deadline,
            COALESCE((SELECT auth.jwt() ->> 'email'), 'shahmproject@gmail.com'),
            true,
            v_now
        )
        ON CONFLICT (table_name) DO UPDATE
            SET subject_name = EXCLUDED.subject_name,
                deadline = EXCLUDED.deadline,
                updated_at = v_now
        RETURNING row_to_json(public.subject_assignments.*)::json INTO v_updated;
    END IF;

    IF v_updated IS NULL THEN
        RAISE EXCEPTION 'Subject assignment "%" not found.', v_table_name
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.update_subject_assignment(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_subject_assignment(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_subject_assignment(p_table_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_table_name TEXT;
    v_deleted_name TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Only authorized administrators can delete subject assignments.'
            USING ERRCODE = '42501';
    END IF;

    v_table_name := trim(COALESCE(p_table_name, ''));
    IF v_table_name = '' OR v_table_name !~ '^[a-z][a-z0-9_]{0,47}$' THEN
        RAISE EXCEPTION 'Invalid subject table identifier.'
            USING ERRCODE = '22023';
    END IF;

    IF v_table_name IN (
        'submission_files',
        'admin_users',
        'student_roster',
        'subject_assignments',
        'verification_attempts'
    ) THEN
        RAISE EXCEPTION 'Protected system table cannot be deleted.'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.subject_assignments
    WHERE table_name = v_table_name
    RETURNING subject_name INTO v_deleted_name;

    IF v_deleted_name IS NULL AND v_table_name <> 'submissions' THEN
        RAISE EXCEPTION 'Subject assignment "%" not found.', v_table_name
            USING ERRCODE = 'P0002';
    END IF;

    IF to_regclass('public.verification_attempts') IS NOT NULL THEN
        DELETE FROM public.verification_attempts
        WHERE table_name = v_table_name;
    END IF;

    IF v_table_name = 'submissions' THEN
        DELETE FROM public.submission_files;
        DELETE FROM public.submissions;
    ELSE
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', v_table_name);
    END IF;

    RETURN json_build_object(
        'success', true,
        'table_name', v_table_name,
        'subject_name', COALESCE(v_deleted_name, 'Compiler Construction')
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_subject_assignment(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_subject_assignment(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
