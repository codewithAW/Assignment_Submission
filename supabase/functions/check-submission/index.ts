// Supabase Edge Function: check-submission
// Secure status verification without exposing private files, hashes, or empty-code bypass

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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const rawRoll = (body.roll_number as string)?.trim() || "";
    const verificationCode = (body.verification_code as string)?.trim() || "";
    const rawTableName = (body.table_name as string)?.trim() || "submissions";

    if (!rawRoll || !verificationCode) {
      return new Response(
        JSON.stringify({ error: "Both roll_number and verification_code are required." }),
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

    if (!/^[a-z][a-z0-9_]{0,47}$/.test(rawTableName)) {
      return new Response(
        JSON.stringify({ error: "Invalid subject identifier." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const codeHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verificationCode)
    );
    const codeHash = Array.from(new Uint8Array(codeHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data, error } = await supabase.rpc("check_subject_submission_secure", {
      p_table_name: rawTableName,
      p_roll_number: rollNumber,
      p_code_hash: codeHash,
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-submission error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to check submission status." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
