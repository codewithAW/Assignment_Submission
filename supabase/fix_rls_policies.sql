-- ===================================================================
-- Hardened Supabase RLS Policies for Assignment Submissions & Storage
-- NOTE: All student reads/writes are routed through validated
--       SECURITY DEFINER RPCs (see supabase/security_hardening.sql).
--       Direct anon SELECT/INSERT/UPDATE on student tables is disabled.
-- ===================================================================

-- 1. Revoke direct anonymous access on submission tables
REVOKE ALL ON TABLE public.submissions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.submission_files FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Allow student insertions" ON public.submissions;
DROP POLICY IF EXISTS "Allow student resubmissions" ON public.submissions;
DROP POLICY IF EXISTS "Allow student file record insertion" ON public.submission_files;
DROP POLICY IF EXISTS "Public read submissions" ON public.submissions;
DROP POLICY IF EXISTS "Anon read submissions" ON public.submissions;

DROP POLICY IF EXISTS "Admins manage submissions" ON public.submissions;
CREATE POLICY "Admins manage submissions"
    ON public.submissions
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins manage submission_files" ON public.submission_files;
CREATE POLICY "Admins manage submission_files"
    ON public.submission_files
    FOR ALL
    TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- 2. Restrict student PDF uploads into the private 'assignments' bucket (.pdf only, no traversal)
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

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

