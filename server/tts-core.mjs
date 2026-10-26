// Natural tutor voices through OpenAI text-to-speech. The key stays on the server.
export class TtsError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const AI_VOICES = ['coral', 'nova', 'shimmer', 'sage', 'ballad', 'verse', 'ash', 'echo', 'onyx', 'fable', 'alloy'];
export const MAX_TTS_CHARS = 1500;
// Audio costs more than text: count each character as 8 tokens so a spoken reply
// weighs about the same as one tutor consultation in the family's monthly limit.
export const ttsTokens = text => text.length * 8;

export function validateTtsRequest(raw) {
  if (!raw || typeof raw !== 'object') throw new TtsError('La petición de voz no es válida.');
  const text = typeof raw.text === 'string' ? raw.text.replace(/[*#`_]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TTS_CHARS) : '';
  if (!text) throw new TtsError('No hay texto para leer.');
  if (!AI_VOICES.includes(raw.voice)) throw new TtsError('Esa voz no existe.');
  const age = Number.isInteger(raw.age) && raw.age >= 3 && raw.age <= 14 ? raw.age : 8;
  return { text, voice: raw.voice, age };
}

export async function runTts(raw, env, fetcher = fetch) {
  const { text, voice, age } = validateTtsRequest(raw);
  const key = (env.OPENAI_API_KEY || '').trim();
  if (!key) throw new TtsError('Las voces naturales necesitan la clave de OpenAI en el servidor.', 503);
  const response = await fetcher('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice, input: text, response_format: 'mp3',
      instructions: `Habla en español neutro, como alguien cercano y alegre que le explica algo a un niño de ${age} años. Ritmo tranquilo, pausas naturales, entonación expresiva y nada robótica.`,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new TtsError('No se pudo generar la voz. Usaremos la voz del dispositivo.', 502);
  return { audio: await response.arrayBuffer(), tokens: ttsTokens(text) };
}
