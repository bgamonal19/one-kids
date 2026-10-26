import { runStudy, StudyError } from '../server/study-core.mjs';
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
// Study-mode lessons, the parent report and syllabus photos share the tutor's monthly limit.
export async function POST(request) {
  let origin;
  try {
    origin = allowedOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new StudyError('Envía la petición como JSON.', 415);
    const user = accountRequired(process.env) ? await verifyUser(bearerToken(request), process.env) : await optionalUser(request);
    const key = user ? `user:${user.id}` : request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    for (const [k, entry] of requests) if (entry.until < now) requests.delete(k);
    const entry = requests.get(key) || { count: 0, until: now + 60_000 };
    if (entry.count >= 10 || requests.size >= 5000) throw new StudyError('Espera un momento antes de pedir otra lección.', 429);
    entry.count++; requests.set(key, entry);
    const raw = await request.text();
    if (raw.length > 2_700_000) throw new StudyError('La foto es demasiado grande.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new StudyError('La petición no es válida.'); }
    const usage = user ? await getUsage(user.id, process.env) : null;
    if (usage && usage.used >= usage.limit) throw new StudyError('Se alcanzó el límite de uso del tutor de este mes. Un adulto puede ampliarlo en el panel de padres.', 429);
    const { tokens, ...result } = await runStudy(body, process.env);
    let account = usage;
    if (user && usage) account = { ...usage, used: (await addUsage(user.id, tokens, process.env)) ?? usage.used + tokens };
    return json({ ...result, account }, 200, origin);
  } catch (error) {
    if (error instanceof OriginError) return json({ error: error.message }, 403);
    const known = error instanceof StudyError || error instanceof AccountError;
    return json({ error: known ? error.message : 'No se pudo preparar la respuesta.' }, known ? error.status : 500, origin);
  }
}
