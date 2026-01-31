export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the path from the request URL
    const url = new URL(request.url);
    const apiUrl = `https://www.moltbook.com/api/v1${url.pathname}${url.search}`;

    try {
      // Proxy to Moltbook with auth
      const response = await fetch(apiUrl, {
        method: request.method,
        headers: {
          'Authorization': `Bearer ${env.MOLTBOOK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: request.method !== 'GET' ? request.body : undefined,
      });

      // Clone response and add CORS headers
      const responseBody = await response.text();
      return new Response(responseBody, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }
};
