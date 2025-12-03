
export default {
  async fetch(request, env, ctx) {
    const TARGET_URL = 'https://generativelanguage.googleapis.com';
    
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key, x-goog-api-client',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Construct the target URL
    // We keep the path and query string from the original request
    const targetUrl = new URL(url.pathname + url.search, TARGET_URL);

    // Create a new request with the modified URL
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    // The original Host header might be set to the worker's host, which Google API won't like.
    // Usually fetch() handles the Host header automatically based on the URL, 
    // but we should ensure we don't pass the original Host header if it's immutable in the headers object.
    // Actually, let's recreate headers to be safe and explicit.
    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', 'generativelanguage.googleapis.com');
    // Remove cf- specific headers if necessary, but usually fine to keep.
    
    try {
      const response = await fetch(targetUrl, {
          method: request.method,
          headers: newHeaders,
          body: request.body
      });

      // Create a new response to send back to the client
      const newResponse = new Response(response.body, response);

      // Add CORS headers to the response
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key, x-goog-api-client');

      return newResponse;
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};
