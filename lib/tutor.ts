import { Platform } from 'react-native';
import type { AgeBand } from './ages';
import { getAccessToken, getTutorEndpoint as getSupabaseEndpoint } from './supabase';

export type TutorProvider = 'auto' | 'openai' | 'anthropic';
export type TutorAction = 'help' | 'read' | 'continue' | 'simpler' | 'example' | 'hint' | 'more' | 'map' | 'draw' | 'images' | 'summary';
/** Parent settings and this month's AI usage for a signed-in family (tokens). */
export type TutorAccount = { openMode: boolean; limit: number; used: number; month: string };
export const TUTOR_LIMITS = [100_000, 300_000, 1_000_000, 3_000_000] as const;
export type SketchColor = 'black' | 'blue' | 'red' | 'green' | 'orange' | 'yellow' | 'brown' | 'purple';
type ShapeStyle = { color: SketchColor; fill: boolean };
/** Shapes on a 0–100 grid, already sanitized by the server. */
export type SketchShape = ShapeStyle & (
  | { s: 'circle'; x: number; y: number; r: number }
  | { s: 'ellipse'; x: number; y: number; rx: number; ry: number }
  | { s: 'rect'; x: number; y: number; w: number; h: number }
  | { s: 'line'; x1: number; y1: number; x2: number; y2: number; arrow: boolean }
  | { s: 'poly'; points: [number, number][]; open?: boolean }
  | { s: 'text'; x: number; y: number; text: string; size: number });
export type BoardVisual =
  | { type: 'map'; title: string; branches: { label: string; details: string[] }[] }
  | { type: 'sketch'; title: string; shapes: SketchShape[] };
export type ImageSearch = { query: string; label: string };
/** A real photo found for an image search (Wikipedia article lead image). */
export type TutorPhoto = ImageSearch & { url: string; width?: number; height?: number; title?: string; page?: string; generated?: boolean };
/** Free mode: what the tutor wants to draw as a realistic AI picture. */
export type PictureRequest = { prompt: string; label: string; style: 'photo' | 'sketch' };
export type TutorRequest = {
  ageBand: AgeBand;
  childName: string;
  message?: string;
  exercise?: string;
  imageBase64?: string;
  /** The child's answer drawn on the whiteboard, as a small PNG/JPEG data URL. */
  handwriting?: string;
  action?: TutorAction;
  /** 'open' is the free assistant a parent enabled; the server checks it. */
  mode?: 'tutor' | 'open';
  provider?: TutorProvider;
  history?: { role: 'tutor' | 'child'; text: string }[];
  /** Exact age: the level of detail grows every two years. */
  age?: number;
  /** The course this lesson belongs to, and what was already done in it. */
  courseTitle?: string;
  memory?: { at: string; topic: string; summary: string }[];
  syllabus?: { current: string; done: string[]; next: string[] } | null;
};
export type TutorResponse = {
  reply: string;
  /** Short lines the tutor writes on the whiteboard while speaking. */
  board?: string[];
  /** A concept map or simple sketch the tutor draws on the board. */
  visual?: BoardVisual | null;
  /** Kid-safe image searches; the app builds the links, never the AI. */
  images?: ImageSearch[];
  photos?: TutorPhoto[];
  picture?: PictureRequest | null;
  /** What the AI read from a handwritten answer. */
  heard?: string;
  /** What was done, sent when a topic or exercise is finished. */
  summary?: string[];
  /** The topic's title, and whether the child just started a different one (a new board). */
  topic?: string;
  newTopic?: boolean;
  account?: TutorAccount | null;
  source: 'openai' | 'anthropic' | 'local';
  transcription?: string;
  needsRetake?: boolean;
};
export type TutorStatus = { configured: boolean; providers: ('openai' | 'anthropic')[]; vision: boolean; accountRequired?: boolean; account?: TutorAccount | null };

export function tutorEndpoint(): string | null {
  return process.env.EXPO_PUBLIC_TUTOR_API_URL || (Platform.OS === 'web' ? '/api/tutor' : getSupabaseEndpoint());
}
async function headers(): Promise<Record<string, string>> {
  const endpoint = tutorEndpoint();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  // The family's session lets the server require an account; the demo has none.
  const token = await getAccessToken().catch(() => null);
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  const supabaseFunction = endpoint === getSupabaseEndpoint() && key;
  if (supabaseFunction) result.apikey = key;
  const bearer = token || (supabaseFunction ? key : '');
  if (bearer) result.Authorization = `Bearer ${bearer}`;
  return result;
}
export async function getTutorStatus(): Promise<TutorStatus> {
  const endpoint = tutorEndpoint();
  if (!endpoint) return { configured: false, providers: [], vision: false };
  const response = await fetch(endpoint, { headers: await headers(), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('No se pudo comprobar la conexión del tutor.');
  const status = await response.json();
  if (typeof status.configured !== 'boolean' || !Array.isArray(status.providers)) throw new Error('El servicio del tutor necesita actualizarse.');
  return status;
}

// Deliberately limited offline practice. It never claims to read photographs.
export function practiceTutor(req: TutorRequest): TutorResponse {
  if (req.imageBase64 || req.action === 'read') throw new Error('Para leer la foto necesitamos conectar la IA. Puedes escribir el enunciado mientras tanto.');
  if (req.handwriting) throw new Error('Para leer lo que escribes en la pizarra necesitamos conectar la IA. Puedes usar el teclado mientras tanto.');
  const text = [req.exercise, req.message, ...(req.history ?? []).filter(h => h.role === 'child').map(h => h.text).reverse()].filter(Boolean).join('\n');
  const match = text.match(/(\d{1,4})\s*([+−-])\s*(\d{1,4})/);
  let reply = 'Estamos en modo práctica, sin IA conectada. Puedo guiarte con una suma o resta sencilla: escribe, por ejemplo, 8 + 3.';
  let board = ['Modo práctica', 'Escribe: 8 + 3'];
  if (match) {
    const a = Number(match[1]), b = Number(match[3]);
    const sum = match[2] === '+';
    const result = sum ? a + b : a - b;
    const action = req.action ?? 'help';
    board = [`${a} ${sum ? '+' : '−'} ${b} = ?`];
    if (action === 'continue') {
      const progressed = (req.history ?? []).filter(h => h.role === 'child' && h.text === 'Ya entendí. Continuemos con el siguiente paso.').length;
      reply = progressed === 0 ? `Ahora haz el movimiento: desde ${a}, cuenta ${b} ${sum ? 'hacia delante' : 'hacia atrás'}. Escríbeme a qué número llegaste.` : `Vamos a comprobarlo: ${a} ${sum ? '+' : '−'} ${b} = ${result}. Compara con tu resultado. Si fue distinto, podemos explicarlo de otra manera.`;
    } else if (action === 'simpler') reply = `Imagínate ${a} fichas. ${sum ? `Añade ${b} fichas` : `Aparta ${b} fichas`}. Cuenta las que quedan ${sum ? 'juntas' : 'en el grupo'}. ¿Quieres probarlo con objetos de casa?`;
    else if (action === 'example') reply = sum ? 'Otro ejemplo: tienes 2 lápices y te dan 1 más. Al juntarlos cuentas 3. Ahora prueba la misma idea con los números de tu ejercicio.' : 'Otro ejemplo: tienes 3 lápices y guardas 1. Quedan 2 sobre la mesa. Ahora prueba la misma idea con tu ejercicio.';
    else if (action === 'hint') reply = `Una pista: ${sum ? 'sumar es juntar o avanzar' : 'restar es quitar o retroceder'}. Empieza en ${a}. ¿Qué harías con el ${b}?`;
    else reply = `Vamos con ${a} ${sum ? '+' : '−'} ${b}. Primer paso: ${sum ? 'vamos a juntar dos cantidades' : 'vamos a quitar una cantidad'}. Coloca ${a} objetos delante de ti. ¿Ya los tienes?`;
  }
  return { reply, board, source: 'local' };
}

export async function askTutor(req: TutorRequest): Promise<TutorResponse> {
  const endpoint = tutorEndpoint();
  if (!endpoint) return practiceTutor(req);
  let response;
  try {
    // Only learning context is sent; the child's name stays on the device.
    const { childName: _name, ...payload } = req;
    response = await fetch(endpoint, { method: 'POST', headers: await headers(), body: JSON.stringify(payload), signal: AbortSignal.timeout(52_000) });
  } catch { throw new Error('No pude conectar con el tutor. Tu consulta sigue aquí para volver a intentarlo.'); }
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 && (!req.provider || req.provider === 'auto') && !req.imageBase64 && !req.handwriting) return practiceTutor(req);
  if (response.status === 401 && !req.imageBase64 && !req.handwriting && req.action !== 'read') {
    const practice = practiceTutor(req);
    return { ...practice, reply: `${data.error || 'El tutor IA es para cuentas familiares.'} Mientras tanto, practiquemos sin IA.\n\n${practice.reply}` };
  }
  if (!response.ok) throw new Error(data.error || 'El tutor no pudo responder. Inténtalo de nuevo.');
  if (typeof data.reply !== 'string' || !['openai', 'anthropic'].includes(data.source)) throw new Error('El servicio del tutor necesita actualizarse.');
  return data;
}

export async function saveTutorSettings(settings: { openMode?: boolean; monthlyLimit?: number }): Promise<TutorAccount | null> {
  const endpoint = tutorEndpoint();
  if (!endpoint) throw new Error('El tutor no está conectado.');
  let response;
  try { response = await fetch(endpoint, { method: 'POST', headers: await headers(), body: JSON.stringify({ settings }), signal: AbortSignal.timeout(15_000) }); }
  catch { throw new Error('No se pudo conectar. Inténtalo de nuevo.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo guardar el ajuste.');
  return data.account ?? null;
}

/** Natural AI voice (web): the server turns the tutor's reply into an MP3. */
export async function fetchTutorVoice(text: string, voice: string, age: number, signal?: AbortSignal): Promise<Blob> {
  const endpoint = tutorEndpoint();
  if (!endpoint || !endpoint.endsWith('/api/tutor')) throw new Error('Las voces naturales no están disponibles aquí.');
  const response = await fetch(endpoint.replace(/\/api\/tutor$/, '/api/tts'), { method: 'POST', headers: await headers(), body: JSON.stringify({ text, voice, age }), signal: signal ?? AbortSignal.timeout(30_000) });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'No se pudo generar la voz.');
  }
  return response.blob();
}

/** Free mode: makes the realistic picture the tutor asked for (counts against the monthly limit). */
export async function generatePicture(picture: PictureRequest): Promise<{ photo: TutorPhoto; account?: TutorAccount | null }> {
  const endpoint = tutorEndpoint();
  if (!endpoint) throw new Error('El tutor no está conectado.');
  let response;
  try { response = await fetch(endpoint, { method: 'POST', headers: await headers(), body: JSON.stringify({ picture }), signal: AbortSignal.timeout(58_000) }); }
  catch { throw new Error('No pude terminar la imagen. Inténtalo otra vez.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.photo?.url !== 'string' || !data.photo.url.startsWith('data:image/')) throw new Error(data.error || 'No pude terminar la imagen.');
  return data;
}
