import { runTutor, tutorStatus, TutorError } from '../server/tutor-core.mjs';

const requests = new Map();
function response(data, status = 200, origin) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
}
function allowedOrigin(request) {
  const origin = request.headers.get('origin');
  const allowed = [new URL(request.url).origin, ...(process.env.TUTOR_ALLOWED_ORIGINS || '').split(',').filter(Boolean)];
  if (origin && !allowed.includes(origin)) throw new TutorError('Origen no permitido.', 403);
  return origin;
}
export function GET(request) {
  try { return response(tutorStatus(process.env), 200, allowedOrigin(request)); }
  catch { return response({ error: 'Origen no permitido.' }, 403); }
}
export function OPTIONS(request) {
  try { return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': allowedOrigin(request) || new URL(request.url).origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } }); }
  catch { return response({ error: 'Origen no permitido.' }, 403); }
}
export async function POST(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new TutorError('Envía la consulta como JSON.', 415);
    // Best-effort burst protection per warm instance; not a durable account quota.
    const now = Date.now();
    for (const [key, entry] of requests) if (entry.until < now) requests.delete(key);
    const key = request.headers.get('x-real-ip') || 'unknown';
    const entry = requests.get(key) || { count: 0, until: now + 60_000 };
    if (entry.count >= 15 || requests.size >= 5000) throw new TutorError('Espera un momento antes de enviar otra consulta.', 429);
    entry.count++; requests.set(key, entry);
    const reader = request.body?.getReader();
    if (!reader) throw new TutorError('La consulta está vacía.');
    const chunks = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_800_000) { await reader.cancel(); throw new TutorError('La foto es demasiado grande.', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new TutorError('La consulta no es válida.'); }
    return response(await runTutor(body, process.env), 200, origin);
  } catch (error) {
    return response({ error: error instanceof TutorError ? error.message : 'No se pudo preparar la respuesta del tutor.' }, error instanceof TutorError ? error.status : 500, origin);
  }
}
