import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!supabaseUrl || !publishableKey || !adminEmail || !adminPassword) {
  throw new Error('Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD in environment.');
}
const client = createClient(supabaseUrl, publishableKey);

async function testStorageUploadAndSignedUrl() {
  console.log('1. Signing in as instructor...');
  await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  console.log('2. Uploading test PDF to assignments bucket...');
  const testPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (CS421 Test Assignment) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
  const buffer = Buffer.from(testPdfContent);

  const testPath = 'FA21-BCS-042/test_upload.pdf';
  const { data: uploadData, error: upErr } = await client.storage
    .from('assignments')
    .upload(testPath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  console.log('Upload result:', { uploadData, error: upErr?.message });

  console.log('3. Generating 60s signed URL...');
  const { data: signedData, error: signErr } = await client.storage
    .from('assignments')
    .createSignedUrl(testPath, 60);

  console.log('Signed URL:', signedData?.signedUrl ? 'SUCCESSFULLY_GENERATED' : null, signErr?.message);
}

testStorageUploadAndSignedUrl();

