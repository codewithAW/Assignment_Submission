import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

// Load Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fmydejwnqxwiimvjuyno.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_4IFGnMdIC_8nD9cBw0ViDA_Hp7pkWFO';

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateSubmissionRef(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CC-${year}-${rand}`;
}

function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function handleApiSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  try {
    const url = 'http://' + (req.headers.host || 'localhost') + req.url;
    // Convert IncomingMessage to Web Request
    const webReq = new Request(url, {
      method: req.method,
      headers: req.headers as any,
      body: req as any,
      duplex: 'half'
    });

    const formData = await webReq.formData();
    const rawStudentName = formData.get('student_name') as string;
    const rawRoll = formData.get('roll_number') as string;
    const rawLiveUrl = formData.get('live_website_url') as string;
    const file = formData.get('file') as File | null;

    if (!rawStudentName?.trim() || !rawRoll?.trim() || !file) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Missing required fields: Student Name, Roll Number, and Assignment PDF are required.'
      }));
      return;
    }

    const studentName = rawStudentName.trim();
    const rollNumber = rawRoll.toUpperCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    const liveWebsiteUrl = rawLiveUrl?.trim() || null;

    // 1. File size validation (100 bytes to 15MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'File size exceeds 15MB limit. Please compress your PDF.'
      }));
      return;
    }
    if (file.size < 100) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'File is too small to be a genuine PDF document.'
      }));
      return;
    }

    // 2. Extension validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Invalid file format. Only genuine .pdf documents are accepted.'
      }));
      return;
    }

    // 3. Binary PDF Magic Bytes validation (%PDF-)
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const headerSlice = buffer.subarray(0, 1024);
    const pdfSignature = Buffer.from('%PDF-');
    if (!headerSlice.includes(pdfSignature)) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: 'Security rejection: Uploaded file does not contain a valid %PDF- binary header. Disguised files are rejected.'
      }));
      return;
    }

    // 4. Check existing submission in Supabase
    const { data: existingSub, error: fetchErr } = await adminClient
      .from('submissions')
      .select('id, status, current_version, submission_ref, verification_code_hash')
      .eq('roll_number', rollNumber)
      .maybeSingle();

    if (fetchErr) {
      console.error('Supabase query error:', fetchErr);
    }

    // Prevent accidental duplicate submissions
    if (existingSub && existingSub.status === 'submitted') {
      res.statusCode = 409;
      res.end(JSON.stringify({
        error: `Roll number ${rollNumber} already has an active submission (${existingSub.submission_ref}). Accidental duplicate submissions are prevented. Please wait for instructor evaluation.`
      }));
      return;
    }

    const isResubmission = Boolean(existingSub && existingSub.status === 'rejected');
    const version = existingSub ? existingSub.current_version + 1 : 1;
    const submissionRef = existingSub?.submission_ref || generateSubmissionRef();
    const verificationCode = generateVerificationCode();
    const codeHash = sha256(verificationCode);
    const nowIso = new Date().toISOString();

    // 5. Upload PDF to private Supabase storage bucket 'assignments'
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${rollNumber}/v${version}_${Date.now()}_${sanitizedFileName}`;

    const { error: uploadErr } = await adminClient.storage
      .from('assignments')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      res.statusCode = 500;
      res.end(JSON.stringify({
        error: `Failed to upload PDF to secure Supabase storage: ${uploadErr.message}`
      }));
      return;
    }

    // 6. Record in submissions table
    let submissionId = existingSub?.id;
    if (existingSub) {
      const { error: updateErr } = await adminClient
        .from('submissions')
        .update({
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          status: 'submitted',
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          current_version: version,
          verification_code_hash: codeHash,
          updated_at: nowIso,
        })
        .eq('id', existingSub.id);

      if (updateErr) {
        console.error('Update submission error:', updateErr);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `Database update failed: ${updateErr.message}` }));
        return;
      }
    } else {
      const { data: newSub, error: insertErr } = await adminClient
        .from('submissions')
        .insert({
          roll_number: rollNumber,
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          submission_ref: submissionRef,
          verification_code_hash: codeHash,
          status: 'submitted',
          current_version: 1,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Insert submission error:', insertErr);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `Database insert failed: ${insertErr.message}` }));
        return;
      }
      submissionId = newSub.id;
    }

    // 7. Record file version in submission_files table
    const { error: fileErr } = await adminClient
      .from('submission_files')
      .insert({
        submission_id: submissionId,
        version: version,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: 'application/pdf',
        uploaded_at: nowIso,
      });

    if (fileErr) {
      console.error('Insert file error:', fileErr);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: `File record failed: ${fileErr.message}` }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      message: isResubmission
        ? `Corrected assignment version ${version} submitted successfully!`
        : 'Assignment submitted successfully!',
      submission_ref: submissionRef,
      verification_code: verificationCode,
      submitted_at: nowIso,
      version: version,
      is_resubmission: isResubmission,
    }));
  } catch (err: any) {
    console.error('API submit error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: err?.message || 'An unexpected server error occurred during assignment submission.'
    }));
  }
}
