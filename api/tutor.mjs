import { runTutor, tutorStatus, TutorError } from '../server/tutor-core.mjs';
import { AccountError, bearerToken, verifyUser } from '../server/account-core.mjs';
import { allowedOrigin, json, OriginError, preflight } from '../server/http.mjs';
import { addUsage, getUsage, saveSettings, validateSettings } from '../server/usage-core.mjs';

const requests = new Map();
// TUTOR_REQUIRE_ACCOUNT=true limits the AI to signed-in families (the demo keeps practice mode).
const accountRequired = env => ['1', 'true', 'yes'].includes(String(env.TUTOR_REQUIRE_ACCOUNT || '').trim().toLowerCase());
const perMinute = env => Math.min(Math.max(Number.parseInt(env.TUTOR_REQUESTS_PER_MINUTE, 10) || 15, 1), 120);

// A signed-in family also gets its open-mode switch and this month's usage (null when metering is not set up).
async function optionalUser(request) {
  const token = bearerToken(request);
  if (!token) return null;
  try { return await verifyUser(token, process.env); } catch { return null; }
}
export async function GET(request) {
  let origin;
  try { origin = allowedOrigin(request); } catch { return json({ error: 'Origen no permitido.' }, 403); }
  const user = await optionalUser(request);
  return json({ ...tutorStatus(process.env), accountRequired: accountRequired(process.env), account: user ? await getUsage(user.id, process.env) : null }, 200, origin);
}
export function OPTIONS(request) { return preflight(request, 'GET, POST, OPTIONS'); }
export async function POST(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new TutorError('Envía la consulta como JSON.', 415);
    const user = accountRequired(process.env) ? await verifyUser(bearerToken(request), process.env) : await optionalUser(request);
    const key = user ? `user:${user.id}` : request.headers.get('x-real-ip') || 'unknown';
    // Best-effort burst protection per warm instance; not a durable account quota.
    const now = Date.now();
    for (const [k, entry] of requests) if (entry.until < now) requests.delete(k);
    const entry = requests.get(key) || { count: 0, until: now + 60_000 };
    if (entry.count >= perMinute(process.env) || requests.size >= 5000) throw new TutorError('Espera un momento antes de enviar otra consulta.', 429);
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
    // Parent panel: switch the open mode or change the monthly limit.
    if (body && typeof body === 'object' && 'settings' in body) {
      if (!user) throw new AccountError('Inicia sesión con tu cuenta familiar para cambiar el tutor.', 401);
      const settings = validateSettings(body.settings);
      if (!settings) throw new TutorError('Ajuste no válido.');
      if (!await saveSettings(user.id, settings, process.env)) throw new TutorError('No se pudo guardar. Revisa que la tabla del tutor esté creada en Supabase.', 503);
      return json({ account: await getUsage(user.id, process.env) }, 200, origin);
    }
    const usage = user ? await getUsage(user.id, process.env) : null;
    if (body?.mode === 'open' && !usage?.openMode) throw new TutorError('El modo libre lo activa un adulto desde el panel de padres.', 403);
    if (usage && usage.used >= usage.limit) throw new TutorError('Se alcanzó el límite de uso del tutor de este mes. Un adulto puede ampliarlo en el panel de padres.', 429);
    const { tokens, ...result } = await runTutor(body, process.env);
    let account = usage;
    if (user && usage) account = { ...usage, used: (await addUsage(user.id, tokens, process.env)) ?? usage.used + tokens };
    return json({ ...result, account }, 200, origin);
  } catch (error) {
    if (error instanceof OriginError) return json({ error: error.message }, 403);
    const known = error instanceof TutorError || error instanceof AccountError;
    return json({ error: known ? error.message : 'No se pudo preparar la respuesta del tutor.' }, known ? error.status : 500, origin);
  }
}
