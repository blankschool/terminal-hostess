import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Fetching media from:', url);
    
    // Detectar se é URL do TikTok e usar headers apropriados
    const isTikTok = url.includes('tiktok') || url.includes('tiktokcdn');
    
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    
    // Headers adicionais para TikTok
    if (isTikTok) {
      headers['Referer'] = 'https://www.tiktok.com/';
      headers['Accept'] = '*/*';
      headers['Accept-Language'] = 'en-US,en;q=0.9';
      headers['Origin'] = 'https://www.tiktok.com';
      headers['Sec-Fetch-Dest'] = 'empty';
      headers['Sec-Fetch-Mode'] = 'cors';
      headers['Sec-Fetch-Site'] = 'same-site';
      
      // Adicionar cookies do TikTok se disponível
      const tiktokCookies = Deno.env.get('TIKTOK_COOKIES');
      if (tiktokCookies) {
        headers['Cookie'] = tiktokCookies;
        console.log('Using TikTok cookies for authentication');
      }
    }
    
    // Fetch the media with appropriate headers
    const response = await fetch(url, { headers });

    console.log('Upstream response status:', response.status, 'statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Failed to fetch media details:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText?.slice(0, 500) || 'no-body',
        isTikTok,
      });
      throw new Error(`Failed to fetch media: ${response.status}`);
    }

    const blob = await response.blob();
    const originalContentType = response.headers.get('content-type') || 'application/octet-stream';
    
    console.log('Successfully fetched media, size:', blob.size, 'type:', originalContentType);

    // IMPORTANTE: Usar application/octet-stream para que o SDK Supabase retorne como Blob
    // Incluir o tipo original em um header customizado
    return new Response(blob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'X-Original-Content-Type': originalContentType,
        'Content-Length': blob.size.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error downloading media:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
