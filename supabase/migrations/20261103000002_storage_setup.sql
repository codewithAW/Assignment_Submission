-- Migration 002: Storage Bucket Configuration
-- Creates private 'assignments' bucket and Row Level Security for documents

-- 1. Create private bucket 'assignments' if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assignments',
    'assignments',
    false, -- STRICTLY PRIVATE. No direct public download.
    15728640, -- 15MB limit in bytes
    ARRAY['application/pdf', 'application/x-pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'application/x-pdf'];

-- 2. Storage RLS policies
-- Authenticated admins can download objects via signed URLs or read bucket
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

-- Service role has full storage permissions
CREATE POLICY "Service role full storage access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'assignments')
    WITH CHECK (bucket_id = 'assignments');
