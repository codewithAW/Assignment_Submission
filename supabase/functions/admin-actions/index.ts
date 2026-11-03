// Supabase Edge Function: admin-actions
// Performs admin-only operations: rejection, signed URLs generation, submissions list

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

    // Verify Authorization Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access: Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is in admin_users table
    const { data: adminRecord, error: adminErr } = await supabase
      .from("admin_users")
      .select("email, role")
      .eq("email", user.email)
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
      const { submission_id, reason } = body;
      if (!submission_id) {
        return new Response(JSON.stringify({ error: "submission_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("submissions")
        .update({
          status: "rejected",
          rejection_reason: reason || "Your assignment has been rejected by the instructor. Please upload an assignment that fulfills the requirements.",
          rejected_at: nowIso,
          rejected_by: user.email,
          updated_at: nowIso,
        })
        .eq("id", submission_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, submission: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. GET SIGNED URL FOR PDF (View or Download)
    if (action === "get-signed-url") {
      const { file_path, download } = body;
      if (!file_path) {
        return new Response(JSON.stringify({ error: "file_path is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 60-second expiring signed URL
      const { data, error } = await supabase.storage
        .from("assignments")
        .createSignedUrl(file_path, 60, {
          download: download ? true : false,
        });

      if (error) throw error;

      return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. FETCH FULL SUBMISSIONS WITH ROSTER
    if (action === "get-dashboard-data") {
      const { data: submissions, error: subErr } = await supabase
        .from("submissions")
        .select(`
          *,
          files:submission_files(*)
        `)
        .order("created_at", { ascending: false });

      if (subErr) throw subErr;

      const { data: roster, error: rosterErr } = await supabase
        .from("student_roster")
        .select("*")
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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Admin operation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
