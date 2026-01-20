import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  urls?: string[];
  url?: string;
  action?: 'download' | 'process';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Instagram webhook called:', new Date().toISOString());
    
    const payload: WebhookPayload = await req.json();
    console.log('Received payload:', JSON.stringify(payload, null, 2));

    // Validate the payload
    if (!payload.urls && !payload.url) {
      console.error('Missing required field: urls or url');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: urls or url' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Normalize to array
    const urlsToProcess = payload.urls || (payload.url ? [payload.url] : []);
    
    console.log(`Processing ${urlsToProcess.length} URLs`);

    // Process each URL
    const results = urlsToProcess.map((url: string) => ({
      url,
      status: 'queued',
      timestamp: new Date().toISOString(),
    }));

    console.log('Processing complete. Results:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Queued ${results.length} URL(s) for processing`,
        results,
        action: payload.action || 'download'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
