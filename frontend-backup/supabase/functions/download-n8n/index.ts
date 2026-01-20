import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const N8N_WEBHOOK_URL = "https://n8n.srv909496.hstgr.cloud/webhook/178b5174-2997-4eb4-869e-3168d3f4d947";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log("📤 Forwarding request to n8n:", {
      urls: body.urls,
      extract_audio: body.extract_audio,
      action: body.action,
    });

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: body.urls,
        extract_audio: body.extract_audio ?? false,
        action: body.action || "download",
        timestamp: new Date().toISOString(),
      }),
    });

    console.log("📥 n8n response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ n8n error response:", errorText);
      return new Response(
        JSON.stringify({ error: `n8n returned status ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    console.log("📥 n8n response content-type:", contentType);

    // Check if it's JSON or binary based on content-type header FIRST
    if (contentType.includes("application/json")) {
      const responseText = await response.text();
      console.log("📥 n8n JSON response body length:", responseText.length);
      
      // Handle empty JSON response
      if (!responseText || responseText.trim() === "") {
        console.log("📥 n8n returned empty JSON response, returning success acknowledgment");
        return new Response(JSON.stringify({ success: true, message: "Request accepted by n8n" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        const data = JSON.parse(responseText);
        console.log("📥 n8n JSON response parsed successfully");
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("❌ Failed to parse JSON:", parseError);
        return new Response(JSON.stringify({ success: true, rawResponse: responseText }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Binary response (video/audio/image) - read as arrayBuffer to preserve binary data
      const arrayBuffer = await response.arrayBuffer();
      console.log("📥 n8n binary response received, size:", arrayBuffer.byteLength, "bytes");
      
      const contentDisposition = response.headers.get("content-disposition") || "";
      // Manter o Content-Type original para que o Blob tenha o tipo correto
      const originalContentType = contentType || "application/octet-stream";
      console.log("📥 Sending response with Content-Type:", originalContentType);
      
      return new Response(arrayBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": originalContentType,  // ✅ Manter tipo original
          "Content-Disposition": contentDisposition,
        },
      });
    }
  } catch (error) {
    console.error("❌ Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
