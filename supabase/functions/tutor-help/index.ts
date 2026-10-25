// Optional mobile backend. Vercel web uses /api/tutor with the same provider logic.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { runTutor, tutorStatus, TutorError } from '../../../server/tutor-core.mjs';
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('TUTOR_ALLOWED_ORIGIN') || 'https://one-kids.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const env = Object.fromEntries(['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_MODEL', 'ANTHROPIC_MODEL', 'TUTOR_DEFAULT_PROVIDER', 'TUTOR_DISABLED'].map(key => [key, Deno.env.get(key)]));
  if (request.method === 'GET') return Response.json(tutorStatus(env), { headers: cors });
  if (request.method !== 'POST') return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: cors });
  try {
    const text = await request.text();
    if (text.length > 2_800_000) throw new TutorError('La foto es demasiado grande.', 413);
    return Response.json(await runTutor(JSON.parse(text), env), { headers: cors });
  } catch (error) {
    return Response.json({ error: error instanceof TutorError ? error.message : 'No se pudo preparar la respuesta.' }, { status: error instanceof TutorError ? error.status : 500, headers: cors });
  }
});
