-- ===================================================================
-- Fix Supabase RLS Policies for Assignment Submissions & Storage
-- Run this in your Supabase SQL Editor if you want to allow direct client writes:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ===================================================================

-- 1. Allow student submissions (Insert new records)
DROP POLICY IF EXISTS "Allow student insertions" ON public.submissions;
CREATE POLICY "Allow student insertions"
    ON public.submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (status = 'submitted');

-- 2. Allow student resubmissions (Update previously rejected assignments)
DROP POLICY IF EXISTS "Allow student resubmissions" ON public.submissions;
CREATE POLICY "Allow student resubmissions"
    ON public.submissions
    FOR UPDATE
    TO anon, authenticated
    USING (status = 'rejected')
    WITH CHECK (status = 'submitted');

-- 3. Allow recording uploaded file metadata
DROP POLICY IF EXISTS "Allow student file record insertion" ON public.submission_files;
CREATE POLICY "Allow student file record insertion"
    ON public.submission_files
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 4. Allow student PDF uploads into the private 'assignments' bucket
DROP POLICY IF EXISTS "Allow student PDF uploads" ON storage.objects;
CREATE POLICY "Allow student PDF uploads"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'assignments');

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

