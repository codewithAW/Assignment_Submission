-- ============================================================================
-- MIGRATION: Edit Assignment (Name + Deadline) & Delete Assignment RPCs
-- ============================================================================

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

-- 1. Admin RPC: Update an existing subject assignment's name and deadline
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
