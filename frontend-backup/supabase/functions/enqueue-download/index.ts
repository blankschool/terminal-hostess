import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getFunctionsBaseUrl = (supabaseUrl: string) => {
  try {
    const url = new URL(supabaseUrl);
    return `${url.protocol}//${url.host.replace(".supabase.co", ".functions.supabase.co")}`;
  } catch {
    return "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const hostingerWorkerUrl = Deno.env.get("HOSTINGER_WORKER_URL") ?? "";
    const callbackToken = Deno.env.get("HOSTINGER_CALLBACK_TOKEN") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !hostingerWorkerUrl) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => null);
    const url = payload?.url;
    const platform = payload?.platform ?? null;
    const priority = payload?.priority ?? 0;
    const options = payload?.options ?? {};

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let requestedBy: string | null = null;

    if (bearer) {
      const { data } = await supabase.auth.getUser(bearer);
      requestedBy = data?.user?.id ?? null;
    }

    const callbackBase = getFunctionsBaseUrl(supabaseUrl);
    const callbackUrl = callbackBase ? `${callbackBase}/download-callback` : null;

    const { data: job, error: insertError } = await supabase
      .from("download_jobs")
      .insert({
        status: "queued",
        source_url: url,
        platform,
        requested_by: requestedBy,
        priority,
        worker: "hostinger",
        public_read: requestedBy ? false : true,
        meta: { options },
        callback_url: callbackUrl,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      return new Response(JSON.stringify({ error: insertError?.message ?? "Failed to create job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workerPayload = {
      job_id: job.id,
      url,
      platform,
      callback_url: callbackUrl,
      callback_token: callbackToken || undefined,
      options,
    };

    const workerResponse = await fetch(`${hostingerWorkerUrl.replace(/\/$/, "")}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerPayload),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text().catch(() => "");
      await supabase
        .from("download_jobs")
        .update({
          status: "failed",
          error_code: "ERR_WORKER",
          error_message: `Worker rejected job: ${workerResponse.status} ${errorText}`.slice(0, 500),
        })
        .eq("id", job.id);

      return new Response(JSON.stringify({ error: "Worker rejected job" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ job_id: job.id, status: "queued" }), {
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
