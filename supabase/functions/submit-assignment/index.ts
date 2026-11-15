// Supabase Edge Function: submit-assignment
// Verifies PDF magic bytes, sanitizes text/URLs/paths, prevents duplicates, records versioning

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function getCorsHeaders(req: Request): Record<string, string> {
  const allowedList = (Deno.env.get("ALLOWED_ORIGIN") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const reqOrigin = req.headers.get("Origin") || "";
  const allowOrigin =
    allowedList.length === 0
      ? "*"
      : allowedList.includes(reqOrigin)
      ? reqOrigin
      : allowedList[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function sanitizeText(input: string | null | undefined, maxLen = 200): string {
  if (!input) return "";
  const noBidi = input.normalize("NFC").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  let clean = "";
  for (let i = 0; i < noBidi.length; i++) {
    const code = noBidi.charCodeAt(i);
    clean += code < 0x20 || code === 0x7f ? " " : noBidi[i];
  }
  return clean.replace(/\s+/g, " ").trim().slice(0, maxLen).trim();
}

function sanitizeHttpUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = sanitizeText(raw, 2048);
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password || !parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeFileName(name: string): string {
  const base = (name || "Assignment.pdf").split(/[/\\]/).pop() || "Assignment.pdf";
  const cleaned = sanitizeText(base, 160)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "");
  if (!cleaned) return "Assignment.pdf";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned.slice(0, 120)}.pdf`;
}

function generatePinCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (1000 + (buf[0] % 9000)).toString();
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const studentName = sanitizeText(formData.get("student_name") as string, 120);
    const rawRoll = sanitizeText(formData.get("roll_number") as string, 25);
    const rawLiveUrl = formData.get("live_website_url") as string;
    const verificationCode = sanitizeText(formData.get("verification_code") as string, 12);
    const file = formData.get("file") as File;

    if (!studentName || studentName.length < 2 || !rawRoll || !file) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid required fields: student_name, roll_number, or file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rollNumber = rawRoll.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
    if (rollNumber.length < 4 || rollNumber.length > 25 || !/^[A-Z0-9]+([-_/][A-Z0-9]+)*$/.test(rollNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid roll number format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let liveWebsiteUrl: string | null = null;
    if (rawLiveUrl && rawLiveUrl.trim()) {
      liveWebsiteUrl = sanitizeHttpUrl(rawLiveUrl);
      if (!liveWebsiteUrl) {
        return new Response(
          JSON.stringify({ error: "Invalid Live Website URL. Only http:// or https:// links without credentials are allowed." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE || file.size < 100) {
      return new Response(
        JSON.stringify({ error: "File size must be between 100 bytes and 15MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Invalid file extension. Only .pdf files are accepted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer.slice(0, 1024));
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2d];
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
          error: "Security validation failed: File does not contain genuine %PDF- binary header.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingSub, error: fetchErr } = await supabase
      .from("submissions")
      .select("id, status, current_version, submission_ref")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (fetchErr) {
      throw fetchErr;
    }

    if (existingSub && existingSub.status === "submitted") {
      return new Response(
        JSON.stringify({
          error: `Roll Number ${rollNumber} already has an active submission (${existingSub.submission_ref}). Duplicate submissions are prevented.`,
          isDuplicate: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let submissionId = existingSub?.id;
    const version = existingSub ? existingSub.current_version + 1 : 1;
    const submissionRef = existingSub
      ? existingSub.submission_ref
      : `SUB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;

    const studentCode = verificationCode || generatePinCode();
    const codeHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(studentCode.trim()));
    const codeHash = Array.from(new Uint8Array(codeHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${rollNumber}/v${version}_${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("assignments")
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const nowIso = new Date().toISOString();

    if (existingSub) {
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
          verification_code_hash: codeHash,
          updated_at: nowIso,
        })
        .eq("id", existingSub.id);

      if (updateSubErr) throw updateSubErr;
      submissionId = existingSub.id;
    } else {
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

    const { error: fileRecordErr } = await supabase.from("submission_files").insert({
      submission_id: submissionId,
      version: version,
      file_path: storagePath,
      file_name: safeFileName,
      file_size: file.size,
      mime_type: "application/pdf",
      uploaded_at: nowIso,
    });

    if (fileRecordErr) throw fileRecordErr;

    return new Response(
      JSON.stringify({
        success: true,
        message: version > 1 ? `Corrected assignment uploaded successfully (v${version}).` : "Assignment submitted successfully.",
        submission_ref: submissionRef,
        verification_code: studentCode,
        submitted_at: nowIso,
        version: version,
        is_resubmission: version > 1,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("submit-assignment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error occurred during submission." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
