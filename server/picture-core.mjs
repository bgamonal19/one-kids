// Realistic pictures drawn by the AI for free mode: OpenAI image generation at the cheapest
// useful setting (small model, low quality, compressed JPEG). The key stays on the server.
export class PictureError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// A low-quality 1024px image costs about two tutor consultations; meter it that way.
export const PICTURE_TOKENS = 5000;
const styles = {
  photo: 'A realistic, natural-looking photograph',
  sketch: 'A detailed, realistic pencil-and-watercolor drawing like an illustrated encyclopedia',
};

export function cleanPicture(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';
  if (prompt.length < 3) return null;
  return { prompt, label: typeof raw.label === 'string' ? raw.label.trim().slice(0, 60) : '', style: raw.style === 'sketch' ? 'sketch' : 'photo' };
}

export async function runPicture(raw, env, fetcher = fetch) {
  const picture = cleanPicture(raw);
  if (!picture) throw new PictureError('No sé qué dibujar.');
  const key = (env.OPENAI_API_KEY || '').trim();
  if (!key) throw new PictureError('Las imágenes necesitan la clave de OpenAI en el servidor.', 503);
  const response = await fetcher('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini', n: 1, size: '1024x1024', quality: 'low',
      output_format: 'jpeg', output_compression: 70, moderation: 'auto',
      prompt: `${styles[picture.style]} for a children's learning app, friendly and safe for kids, accurate details, no text or letters: ${picture.prompt}`,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    console.error(`[picture] openai ${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`);
    throw new PictureError('No pude hacer la imagen esta vez.', 502);
  }
  const b64 = (await response.json())?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || !b64) throw new PictureError('No pude hacer la imagen esta vez.', 502);
  return { photo: { query: picture.prompt.slice(0, 60), label: picture.label, url: `data:image/jpeg;base64,${b64}`, width: 1024, height: 1024, generated: true }, tokens: PICTURE_TOKENS };
}
