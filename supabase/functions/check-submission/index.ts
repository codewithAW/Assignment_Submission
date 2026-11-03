// Supabase Edge Function: check-submission
// Secure status verification without exposing private files or internal URLs

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const rawRoll = (body.roll_number as string)?.trim();
    const verificationCode = (body.verification_code as string)?.trim();

    if (!rawRoll) {
      return new Response(
        JSON.stringify({ error: "Roll number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rollNumber = rawRoll.toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");

    // Compute hash of provided verification code
    let codeHash = "";
    if (verificationCode) {
      const codeHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verificationCode.trim())
      );
      codeHash = Array.from(new Uint8Array(codeHashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    // Call secure Postgres RPC
    const { data, error } = await supabase.rpc("check_submission_secure", {
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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to check submission status." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

