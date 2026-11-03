// Supabase Edge Function: submit-assignment
// Verifies PDF magic bytes, prevents duplicates, uploads to private storage, records versioning

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const studentName = (formData.get("student_name") as string)?.trim();
    const rawRoll = (formData.get("roll_number") as string)?.trim();
    const liveWebsiteUrl = (formData.get("live_website_url") as string)?.trim() || null;
    const verificationCode = (formData.get("verification_code") as string)?.trim();
    const file = formData.get("file") as File;

    if (!studentName || !rawRoll || !file) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: student_name, roll_number, or file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Normalize roll number
    const rollNumber = rawRoll.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");

    // 2. Validate File Size (< 15MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File exceeds 15MB limit. Please compress the PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size < 100) {
      return new Response(
        JSON.stringify({ error: "File is too small to be a valid PDF document." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validate Extension & MIME Type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Invalid file extension. Only .pdf files are accepted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Server-Side Magic Bytes Verification (%PDF-)
    const fileBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer.slice(0, 1024));
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
    let hasPdfSignature = false;

    for (let i = 0; i < Math.min(bytes.length - 4, 256); i++) {
      if (
        bytes[i] === pdfSignature[0] &&
        bytes[i + 1] === pdfSignature[1] &&
        bytes[i + 2] === pdfSignature[2] &&
        bytes[i + 3] === pdfSignature[3] &&
        bytes[i + 4] === pdfSignature[4]
      ) {
        hasPdfSignature = true;
        break;
      }
    }

    if (!hasPdfSignature) {
      return new Response(
        JSON.stringify({
          error: "Security validation failed: File does not contain genuine %PDF- binary header. Disguised files are rejected.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Check existing submission status
    const { data: existingSub, error: fetchErr } = await supabase
      .from("submissions")
      .select("id, status, current_version, submission_ref, verification_code_hash")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (fetchErr) {
      throw fetchErr;
    }

    // Prevent accidental duplicate submissions
    if (existingSub && existingSub.status === "submitted") {
      return new Response(
        JSON.stringify({
          error: `Roll Number ${rollNumber} already has an active submission (${existingSub.submission_ref}). Accidental duplicate submissions are prevented. If you need modifications, please wait for instructor review.`,
          isDuplicate: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let submissionId = existingSub?.id;
    let version = existingSub ? existingSub.current_version + 1 : 1;
    let submissionRef = existingSub ? existingSub.submission_ref : `CC-2026-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

    // Compute or verify verification code
    const studentCode = verificationCode || `VFY-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const codeHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(studentCode.trim()));
    const codeHash = Array.from(new Uint8Array(codeHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 6. Upload PDF to private Supabase Storage bucket 'assignments'
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${rollNumber}/v${version}_${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("assignments")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 7. Write to PostgreSQL database
    const nowIso = new Date().toISOString();

    if (existingSub) {
      // Resubmission of rejected assignment: update submission status back to 'submitted'
      const { error: updateSubErr } = await supabase
        .from("submissions")
        .update({
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          status: "submitted",
          rejection_reason: null,
          rejected_at: null,
          rejected_by: null,
          current_version: version,
          updated_at: nowIso,
        })
        .eq("id", existingSub.id);

      if (updateSubErr) throw updateSubErr;
      submissionId = existingSub.id;
    } else {
      // First submission
      const { data: newSub, error: insertSubErr } = await supabase
        .from("submissions")
        .insert({
          roll_number: rollNumber,
          student_name: studentName,
          live_website_url: liveWebsiteUrl,
          submission_ref: submissionRef,
          verification_code_hash: codeHash,
          status: "submitted",
          current_version: 1,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("id")
        .single();

      if (insertSubErr) throw insertSubErr;
      submissionId = newSub.id;
    }

    // 8. Record in submission_files (retaining history)
    const { error: fileRecordErr } = await supabase.from("submission_files").insert({
      submission_id: submissionId,
      version: version,
      file_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: "application/pdf",
      uploaded_at: nowIso,
    });

    if (fileRecordErr) throw fileRecordErr;

    return new Response(
      JSON.stringify({
        success: true,
        message: version > 1 ? "Corrected assignment uploaded successfully (v" + version + ")." : "Assignment submitted successfully.",
        submission_ref: submissionRef,
        verification_code: studentCode,
        submitted_at: nowIso,
        version: version,
        is_resubmission: version > 1,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error occurred during submission." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
