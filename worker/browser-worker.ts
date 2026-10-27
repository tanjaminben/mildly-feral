// Assets only: there are no notebook, identity, database or photo-upload services.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname.startsWith('/api/') || /(?:^|\/)\./.test(url.pathname)) return new Response('Not found', { status: 404 });
    const response = await env.ASSETS.fetch(request);
    const result = new Response(response.body, response);
    result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
    result.headers.set('Referrer-Policy', 'no-referrer');
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('X-Frame-Options', 'DENY');
    result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Keep Cloudflare's automatic analytics injection out of this browser notebook.
    if ((response.headers.get('Content-Type') || '').includes('text/html')) result.headers.set('Cache-Control', 'public, no-cache, no-transform');
    return result;
  },
} satisfies ExportedHandler<BrowserWorkerEnv>;
