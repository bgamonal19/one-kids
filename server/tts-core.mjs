// Natural tutor voices through OpenAI text-to-speech. The key stays on the server.
export class TtsError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Only warm, bright voices: deep or flat ones (onyx, echo, ash, alloy, fable) scared younger children.
// marin and cedar are OpenAI's most natural voices.
export const AI_VOICES = ['marin', 'cedar', 'coral', 'nova', 'shimmer', 'sage', 'ballad', 'verse'];
export const MAX_TTS_CHARS = 1500;
// Audio costs more than text: count each character as 8 tokens so a spoken reply
// weighs about the same as one tutor consultation in the family's monthly limit.
export const ttsTokens = text => text.length * 8;

// Say symbols and drop emojis so the voice reads "ocho más tres" instead of spelling signs.
export function spokenText(raw) {
  return raw
    .replace(/[*#`_~>|[\]{}]/g, ' ')
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, ' ')
    .replace(/(\d)\s*[x×·*]\s*(\d)/g, '$1 por $2')
    .replace(/(\d)\s*÷\s*(\d)/g, '$1 entre $2')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 entre $2')
    .replace(/\s*\+\s*/g, ' más ')
    .replace(/(\d)\s*[−–-]\s*(\d)/g, '$1 menos $2')
    .replace(/\s*=\s*\?/g, ' es igual a… ¿cuánto?')
    .replace(/\s*=\s*/g, ' es igual a ')
    .replace(/\s*→\s*/g, ', ')
    .replace(/[✓✔]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateTtsRequest(raw) {
  if (!raw || typeof raw !== 'object') throw new TtsError('La petición de voz no es válida.');
  const text = typeof raw.text === 'string' ? spokenText(raw.text).slice(0, MAX_TTS_CHARS) : '';
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
      instructions: [
        `Eres la voz de un tutor amable que acompaña a un niño de ${age} años. Hablas español con acento natural de nativo, nunca con acento extranjero.`,
        'Voz cálida, dulce y sonriente, como una maestra cariñosa o un cuentacuentos que lee en voz alta junto al niño. Transmite calma y confianza; nada de tonos graves, serios, fríos ni misteriosos.',
        'Habla un poco más despacio de lo normal, con pausas cortas entre frases y entonación viva y expresiva: alegra la voz en las felicitaciones y sube la entonación en las preguntas.',
        'Suena como una persona real conversando, no como un locutor ni una máquina.',
      ].join(' '),
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    console.error(`[tts] openai ${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`);
    throw new TtsError('No se pudo generar la voz. Usaremos la voz del dispositivo.', 502);
  }
  return { audio: await response.arrayBuffer(), tokens: ttsTokens(text) };
}
