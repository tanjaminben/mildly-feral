// This handler is composed with the portfolio Worker by its bounded packager.
// It serves assets only. Saved notebooks and photo blobs never reach this handler.
export const mildlyFeralBase = '/mildlyferal';
export const mildlyFeralHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
export const isMildlyFeralPath = path => path === mildlyFeralBase || path.startsWith(mildlyFeralBase + '/');

export async function serveMildlyFeral(request, assets) {
  const url = new URL(request.url);
  if (!isMildlyFeralPath(url.pathname)) return new Response('Not found', { status: 404, headers: mildlyFeralHeaders });
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...mildlyFeralHeaders, Allow: 'GET, HEAD' } });
  const path = url.pathname.slice(mildlyFeralBase.length);
  if (path.startsWith('/api/') || /(?:^|\/)\./.test(path)) return new Response('Not found', { status: 404, headers: mildlyFeralHeaders });
  if (path === '/' || path === '/index.html') {
    url.pathname = mildlyFeralBase;
    return new Response(null, { status: 308, headers: { ...mildlyFeralHeaders, Location: url.href } });
  }
  // Pages maps a directory URL to index.html without an index.html redirect loop.
  if (!path) url.pathname = mildlyFeralBase + '/';
  const response = await assets.fetch(new Request(url, request));
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(mildlyFeralHeaders)) result.headers.set(name, value);
  if ((response.headers.get('Content-Type') || '').includes('text/html')) result.headers.set('Cache-Control', 'public, no-cache, no-transform');
  return result;
}
