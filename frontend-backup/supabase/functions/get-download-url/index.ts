import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OutputItem = {
  storage_path?: string;
  thumbnail_path?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => null);
    const jobId = payload?.job_id;
    const storagePath = payload?.storage_path;
    const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 3600;

    if (!jobId || !storagePath) {
      return new Response(JSON.stringify({ error: "job_id and storage_path are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let requesterId: string | null = null;

    if (bearer) {
      const { data } = await supabase.auth.getUser(bearer);
      requesterId = data?.user?.id ?? null;
    }

    const { data: job, error } = await supabase
      .from("download_jobs")
      .select("public_read, requested_by, output_items")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!job.public_read && (!requesterId || job.requested_by !== requesterId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outputItems = Array.isArray(job.output_items) ? (job.output_items as OutputItem[]) : [];
    const allowed = outputItems.some(
      (item) => item.storage_path === storagePath || item.thumbnail_path === storagePath,
    );

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Path not found for job" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("downloads")
      .createSignedUrl(storagePath, expiresIn);

    if (signedError || !signed) {
      return new Response(JSON.stringify({ error: signedError?.message ?? "Failed to sign URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
