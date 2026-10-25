// Shared by the Vercel functions in api/. Requests without Origin come from native apps.
export class OriginError extends Error {}
export function allowedOrigin(request) {
  const origin = request.headers.get('origin');
  const allowed = [new URL(request.url).origin, ...(process.env.TUTOR_ALLOWED_ORIGINS || '').split(',').filter(Boolean)];
  if (origin && !allowed.includes(origin)) throw new OriginError('Origen no permitido.');
  return origin;
}
export function json(data, status = 200, origin) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
}
export function preflight(request, methods) {
  try {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': allowedOrigin(request) || new URL(request.url).origin, 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', Vary: 'Origin' } });
  } catch { return json({ error: 'Origen no permitido.' }, 403); }
}
