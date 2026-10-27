// Realistic pictures drawn by the AI for free mode: OpenAI image generation at the cheapest
// useful setting (small model, low quality, compressed JPEG). The key stays on the server.
import { traceDrawing } from './trace-core.mjs';

export class PictureError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// A low-quality 1024px image costs about two tutor consultations; meter it that way.
export const PICTURE_TOKENS = 5000;
const styles = {
  photo: 'A realistic, natural-looking photograph',
  sketch: 'A detailed, realistic pencil-and-watercolor drawing like an illustrated encyclopedia',
  // Whiteboard animation: black ink lines the pencil can trace, a few flat colours, nothing to hide the lines.
  line: 'A whiteboard animation illustration like an explainer video: clean, confident black ink outlines on a pure white background, hand-drawn look, a few flat colour accents (blue, yellow, orange, green), crisp expressive educational cartoon artwork, clear silhouettes and carefully drawn recognizable anatomy, uncluttered composition, no shading, no gradients, no panels or borders, no background scenery beyond what is needed, all of it inside the frame,',
};

export function cleanPicture(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 520) : '';
  if (prompt.length < 3) return null;
  let baseImage;
  if (raw.baseImage !== undefined) {
    if (typeof raw.baseImage !== 'string' || raw.baseImage.length > 2_400_000 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(raw.baseImage)) throw new PictureError('La imagen de referencia no es válida.');
    baseImage = raw.baseImage;
  }
  return { ...(baseImage ? { baseImage } : {}), prompt, label: typeof raw.label === 'string' ? raw.label.trim().slice(0, 60) : '', style: raw.style === 'sketch' || raw.style === 'line' ? raw.style : 'photo' };
}

export async function runPicture(raw, env, fetcher = fetch) {
  const picture = cleanPicture(raw);
  if (!picture) throw new PictureError('No sé qué dibujar.');
  const key = (env.OPENAI_API_KEY || '').trim();
  if (!key) throw new PictureError('Las imágenes necesitan la clave de OpenAI en el servidor.', 503);
  const model = picture.baseImage ? env.OPENAI_IMAGE_EDIT_MODEL || 'gpt-image-1.5' : env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
  const response = await fetcher(`https://api.openai.com/v1/images/${picture.baseImage ? 'edits' : 'generations'}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, n: 1, size: '1024x1024', quality: picture.style === 'line' ? 'medium' : 'low',
      output_format: 'jpeg', output_compression: 70, moderation: 'auto',
      ...(picture.baseImage ? { images: [{ image_url: picture.baseImage }], ...(model === 'gpt-image-1.5' ? { input_fidelity: 'high' } : {}) } : {}),
      prompt: `${picture.baseImage ? 'Edit the supplied drawing. Preserve its existing subjects, positions, proportions and composition. Apply ONLY the requested additions or changes in the requested positions; fit additions in the free space. Do not replace the scene. ' : ''}${styles[picture.style]} for a children's learning app, friendly and safe for kids, accurate details, no text or letters: ${picture.prompt}`,
    }),
    signal: AbortSignal.timeout(52_000),
  });
  if (!response.ok) {
    console.error(`[picture] openai ${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`);
    throw new PictureError('No pude hacer la imagen esta vez.', 502);
  }
  const b64 = (await response.json())?.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || !b64) throw new PictureError('No pude hacer la imagen esta vez.', 502);
  const url = `data:image/jpeg;base64,${b64}`;
  const photo = { query: picture.prompt.slice(0, 60), label: picture.label, url, width: 1024, height: 1024, generated: true };
  if (picture.style !== 'line') return { photo, tokens: PICTURE_TOKENS };
  // The strokes the pencil follows to reveal the drawing on the board.
  let trace = { rings: [], fills: [] };
  try { trace = traceDrawing(b64); } catch (error) { console.error(`[picture] trace failed ${String(error?.message ?? error).slice(0, 120)}`); }
  return { photo, trace: { ...trace, image: url }, tokens: PICTURE_TOKENS };
}
