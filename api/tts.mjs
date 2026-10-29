import { runTts, TtsError } from '../server/tts-core.mjs';
import { AccountError, bearerToken, verifyUser } from '../server/account-core.mjs';
import { allowedOrigin, json, OriginError, preflight } from '../server/http.mjs';
import { addUsage, getUsage } from '../server/usage-core.mjs';

const requests = new Map();
const accountRequired = env => ['1', 'true', 'yes'].includes(String(env.TUTOR_REQUIRE_ACCOUNT || '').trim().toLowerCase());

async function optionalUser(request) {
  const token = bearerToken(request);
  if (!token) return null;
  try { return await verifyUser(token, process.env); } catch { return null; }
}
export function OPTIONS(request) { return preflight(request, 'POST, OPTIONS'); }
export async function POST(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new TtsError('Envía la petición como JSON.', 415);
    const user = accountRequired(process.env) ? await verifyUser(bearerToken(request), process.env) : await optionalUser(request);
    const key = user ? `user:${user.id}` : request.headers.get('x-real-ip') || 'unknown';
    // Best-effort burst protection per warm instance, like the tutor.
    const now = Date.now();
    for (const [k, entry] of requests) if (entry.until < now) requests.delete(k);
    const entry = requests.get(key) || { count: 0, until: now + 60_000 };
    if (entry.count >= 30 || requests.size >= 5000) throw new TtsError('Espera un momento antes de escuchar otra vez.', 429);
    entry.count++; requests.set(key, entry);
    const text = await request.text();
    if (text.length > 20_000) throw new TtsError('El texto es demasiado largo.', 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new TtsError('La petición de voz no es válida.'); }
    const usage = user ? await getUsage(user.parentId || user.id, process.env) : null;
    if (usage && usage.used >= usage.limit) throw new TtsError('Se alcanzó el límite de uso del tutor de este mes.', 429);
    const { audio, tokens } = await runTts(body, process.env);
    if (user && usage) await addUsage(user.parentId || user.id, tokens, process.env);
    return new Response(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
  } catch (error) {
    if (error instanceof OriginError) return json({ error: error.message }, 403);
    const known = error instanceof TtsError || error instanceof AccountError;
    return json({ error: known ? error.message : 'No se pudo generar la voz.' }, known ? error.status : 500, origin);
  }
}
