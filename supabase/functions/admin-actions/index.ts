// Supabase Edge Function: admin-actions
// Performs admin-only operations: rejection, signed URLs generation, submissions list (excludes code hashes)

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

function sanitizeText(input: string | null | undefined, maxLen = 1000): string {
  if (!input) return "";
  const noBidi = input.normalize("NFC").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  let clean = "";
  for (let i = 0; i < noBidi.length; i++) {
    const code = noBidi.charCodeAt(i);
    if (code === 0x7f || (code < 0x20 && code !== 0x0a && code !== 0x0d)) {
      clean += " ";
    } else {
      clean += noBidi[i];
    }
  }
  return clean.trim().slice(0, maxLen).trim();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_PDF_PATH_REGEX = /^[A-Za-z0-9][A-Za-z0-9._/-]*\.pdf$/i;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized access: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRecord, error: adminErr } = await supabase
      .from("admin_users")
      .select("email, role")
      .eq("email", user.email.toLowerCase().trim())
      .maybeSingle();

    if (adminErr || !adminRecord) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You are not registered as an authorized administrator or instructor." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action;

    // 1. REJECT SUBMISSION
    if (action === "reject") {
      const submissionId = typeof body.submission_id === "string" ? body.submission_id.trim() : "";
      if (!UUID_REGEX.test(submissionId)) {
        return new Response(JSON.stringify({ error: "Valid submission_id UUID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reason =
        sanitizeText(body.reason, 1000) ||
        "Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.";

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("submissions")
        .update({
          status: "rejected",
          rejection_reason: reason,
          rejected_at: nowIso,
          rejected_by: user.email,
          updated_at: nowIso,
        })
        .eq("id", submissionId)
        .select("id, roll_number, student_name, live_website_url, submission_ref, status, rejection_reason, rejected_at, rejected_by, current_version, created_at, updated_at")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, submission: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. GET SIGNED URL FOR PDF
    if (action === "get-signed-url") {
      const filePath = typeof body.file_path === "string" ? body.file_path.trim() : "";
      if (
        !filePath ||
        filePath.includes("..") ||
        filePath.includes("//") ||
        !SAFE_PDF_PATH_REGEX.test(filePath)
      ) {
        return new Response(JSON.stringify({ error: "Invalid file_path requested" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.storage
        .from("assignments")
        .createSignedUrl(filePath, 60, {
          download: Boolean(body.download),
        });

      if (error) throw error;

      return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. FETCH SUBMISSIONS (never returning verification_code_hash) + ROSTER
    if (action === "get-dashboard-data") {
      const { data: submissions, error: subErr } = await supabase
        .from("submissions")
        .select(`
          id, roll_number, student_name, live_website_url, submission_ref, status, rejection_reason, rejected_at, rejected_by, current_version, created_at, updated_at,
          files:submission_files(id, submission_id, version, file_path, file_name, file_size, mime_type, uploaded_at)
        `)
        .order("created_at", { ascending: false });

      if (subErr) throw subErr;

      const { data: roster, error: rosterErr } = await supabase
        .from("student_roster")
        .select("roll_number, student_name, email, created_at")
        .order("roll_number", { ascending: true });

      if (rosterErr) throw rosterErr;

      return new Response(JSON.stringify({ submissions, roster }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action specified" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-actions error:", error);
    return new Response(
      JSON.stringify({ error: "Admin operation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
