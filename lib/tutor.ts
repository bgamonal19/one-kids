import type { AgeBand } from './ages';
import { tutorTone } from './ages';
import { getTutorEndpoint, isSupabaseConfigured } from './supabase';

export type TutorRequest = {
  ageBand: AgeBand;
  childName: string;
  message?: string;
  imageBase64?: string;
  history?: { role: 'tutor' | 'child'; text: string }[];
};

export type TutorResponse = {
  reply: string;
  source: 'edge' | 'local';
};

const SYSTEM_RULES = `
Eres el tutor de ONE KIDS. Guías paso a paso. Nunca des la respuesta final de golpe.
Da UN paso corto, luego una pregunta de comprobación.
Si hay foto de tarea, describe lo que ves con palabras simples y empieza por el primer paso.
Responde siempre en español.
`.trim();

function localTutor(req: TutorRequest): string {
  const name = req.childName || 'campeón';
  const msg = (req.message ?? '').toLowerCase();
  const hasImage = Boolean(req.imageBase64);

  if (hasImage && !msg) {
    return `¡Hola ${name}! Ya vi tu tarea. Primero vamos a leer el enunciado con calma.\n\nPaso 1: ¿Qué te pide el problema en tus propias palabras? Escríbemelo o cuéntamelo.`;
  }

  const sumMatch = msg.match(/(\d+)\s*\+\s*(\d+)/);
  if (sumMatch) {
    const a = Number(sumMatch[1]);
    const b = Number(sumMatch[2]);
    return `¡Buena pregunta, ${name}! Vamos con ${a} + ${b}.\n\nPaso 1: Empieza en ${a} y cuenta ${b} más con los dedos o una rayita.\n\n¿Hasta qué número llegas?`;
  }

  const subMatch = msg.match(/(\d+)\s*-\s*(\d+)/);
  if (subMatch) {
    const a = Number(subMatch[1]);
    const b = Number(subMatch[2]);
    return `Vamos paso a paso con ${a} − ${b}.\n\nPaso 1: Imagina que tienes ${a} y quitas ${b}.\n\n¿Cuántos te quedan?`;
  }

  if (msg.includes('no sé') || msg.includes('ayuda') || msg.includes('help')) {
    return `Está bien no saberlo aún, ${name}. Eso es aprender.\n\nPaso 1: Dime qué materia es (mates, lectura, ciencias…) y qué parte te trabó.`;
  }

  if (req.history && req.history.length > 0) {
    return `Sigamos, ${name}.\n\nPaso siguiente: revisa lo que escribiste y marca la parte que ya entiendes.\n\n¿Qué número o palabra crees que va en el siguiente espacio?`;
  }

  return `¡Hola ${name}! Soy tu tutor de ONE KIDS.\n\nPaso 1: Tómale foto a tu tarea o escríbeme el problema.\n\n¿Listo para empezar?`;
}

export async function askTutor(req: TutorRequest): Promise<TutorResponse> {
  const endpoint = getTutorEndpoint();

  if (endpoint && isSupabaseConfigured) {
    try {
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          system: `${SYSTEM_RULES}\n${tutorTone(req.ageBand)}`,
          childName: req.childName,
          ageBand: req.ageBand,
          message: req.message,
          imageBase64: req.imageBase64,
          history: req.history,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) {
          return { reply: data.reply, source: 'edge' };
        }
      }
    } catch {
      // fall through to local
    }
  }

  return { reply: localTutor(req), source: 'local' };
}
