import { Platform } from 'react-native';
import type { AgeBand } from './ages';
import { getTutorEndpoint as getSupabaseEndpoint } from './supabase';

export type TutorProvider = 'auto' | 'openai' | 'anthropic';
export type TutorAction = 'help' | 'read' | 'continue' | 'simpler' | 'example' | 'hint';
export type TutorRequest = {
  ageBand: AgeBand;
  childName: string;
  message?: string;
  exercise?: string;
  imageBase64?: string;
  action?: TutorAction;
  provider?: TutorProvider;
  history?: { role: 'tutor' | 'child'; text: string }[];
};
export type TutorResponse = {
  reply: string;
  source: 'openai' | 'anthropic' | 'local';
  transcription?: string;
  needsRetake?: boolean;
};
export type TutorStatus = { configured: boolean; providers: ('openai' | 'anthropic')[]; vision: boolean };

export function tutorEndpoint(): string | null {
  return process.env.EXPO_PUBLIC_TUTOR_API_URL || (Platform.OS === 'web' ? '/api/tutor' : getSupabaseEndpoint());
}
function headers(): Record<string, string> {
  const endpoint = tutorEndpoint();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { 'Content-Type': 'application/json', ...(endpoint === getSupabaseEndpoint() && key ? { Authorization: `Bearer ${key}`, apikey: key } : {}) };
}
export async function getTutorStatus(): Promise<TutorStatus> {
  const endpoint = tutorEndpoint();
  if (!endpoint) return { configured: false, providers: [], vision: false };
  const response = await fetch(endpoint, { headers: headers(), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('No se pudo comprobar la conexión del tutor.');
  const status = await response.json();
  if (typeof status.configured !== 'boolean' || !Array.isArray(status.providers)) throw new Error('El servicio del tutor necesita actualizarse.');
  return status;
}

// Deliberately limited offline practice. It never claims to read photographs.
export function practiceTutor(req: TutorRequest): TutorResponse {
  if (req.imageBase64 || req.action === 'read') throw new Error('Para leer la foto necesitamos conectar la IA. Puedes escribir el enunciado mientras tanto.');
  const text = [req.exercise, req.message, ...(req.history ?? []).filter(h => h.role === 'child').map(h => h.text).reverse()].filter(Boolean).join('\n');
  const match = text.match(/(\d{1,4})\s*([+−-])\s*(\d{1,4})/);
  let reply = 'Estamos en modo práctica, sin IA conectada. Puedo guiarte con una suma o resta sencilla: escribe, por ejemplo, 8 + 3.';
  if (match) {
    const a = Number(match[1]), b = Number(match[3]);
    const sum = match[2] === '+';
    const result = sum ? a + b : a - b;
    const action = req.action ?? 'help';
    if (action === 'continue') {
      const progressed = (req.history ?? []).filter(h => h.role === 'child' && h.text === 'Ya entendí. Continuemos con el siguiente paso.').length;
      reply = progressed === 0 ? `Ahora haz el movimiento: desde ${a}, cuenta ${b} ${sum ? 'hacia delante' : 'hacia atrás'}. Escríbeme a qué número llegaste.` : `Vamos a comprobarlo: ${a} ${sum ? '+' : '−'} ${b} = ${result}. Compara con tu resultado. Si fue distinto, podemos explicarlo de otra manera.`;
    } else if (action === 'simpler') reply = `Imagínate ${a} fichas. ${sum ? `Añade ${b} fichas` : `Aparta ${b} fichas`}. Cuenta las que quedan ${sum ? 'juntas' : 'en el grupo'}. ¿Quieres probarlo con objetos de casa?`;
    else if (action === 'example') reply = sum ? 'Otro ejemplo: tienes 2 lápices y te dan 1 más. Al juntarlos cuentas 3. Ahora prueba la misma idea con los números de tu ejercicio.' : 'Otro ejemplo: tienes 3 lápices y guardas 1. Quedan 2 sobre la mesa. Ahora prueba la misma idea con tu ejercicio.';
    else if (action === 'hint') reply = `Una pista: ${sum ? 'sumar es juntar o avanzar' : 'restar es quitar o retroceder'}. Empieza en ${a}. ¿Qué harías con el ${b}?`;
    else reply = `Vamos con ${a} ${sum ? '+' : '−'} ${b}. Primer paso: ${sum ? 'vamos a juntar dos cantidades' : 'vamos a quitar una cantidad'}. Coloca ${a} objetos delante de ti. ¿Ya los tienes?`;
  }
  return { reply, source: 'local' };
}

export async function askTutor(req: TutorRequest): Promise<TutorResponse> {
  const endpoint = tutorEndpoint();
  if (!endpoint) return practiceTutor(req);
  let response;
  try {
    // Only learning context is sent; the child's name stays on the device.
    const { childName: _name, ...payload } = req;
    response = await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify(payload), signal: AbortSignal.timeout(52_000) });
  } catch { throw new Error('No pude conectar con el tutor. Tu consulta sigue aquí para volver a intentarlo.'); }
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 && (!req.provider || req.provider === 'auto') && !req.imageBase64) return practiceTutor(req);
  if (!response.ok) throw new Error(data.error || 'El tutor no pudo responder. Inténtalo de nuevo.');
  if (typeof data.reply !== 'string' || !['openai', 'anthropic'].includes(data.source)) throw new Error('El servicio del tutor necesita actualizarse.');
  return data;
}
