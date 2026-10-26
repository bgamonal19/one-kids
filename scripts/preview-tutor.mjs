// Local static preview plus the exact production API. No credentials are required.
// Optional fixtures exist ONLY in this script and never in api/tutor.mjs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GET, POST, OPTIONS } from '../api/tutor.mjs';
import { POST as ttsPOST } from '../api/tts.mjs';
import { runTutor } from '../server/tutor-core.mjs';
const port = Number(process.env.PORT || 8102);
const root = path.resolve('dist');
const fixtures = process.env.TUTOR_TEST_FIXTURES === '1';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/api/tts') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      let response;
      if (fixtures) {
        // A short tone stands in for the natural voice; no OpenAI call.
        const rate = 8000, samples = rate / 2, wav = Buffer.alloc(44 + samples);
        wav.write('RIFF', 0); wav.writeUInt32LE(36 + samples, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(samples, 40);
        for (let i = 0; i < samples; i++) wav[44 + i] = 128 + Math.round(40 * Math.sin(i / 6));
        response = new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
      } else response = await ttsPOST(new Request(url, { method: req.method, headers: req.headers, body: Buffer.concat(chunks) }));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    if (url.pathname === '/api/tutor') {
      let response;
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 2_800_000) throw Error('too large'); chunks.push(chunk); }
      const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
      if (fixtures && req.method === 'GET') response = Response.json({ configured: true, providers: ['openai', 'anthropic'], vision: true, account: { openMode: true, limit: 300000, used: 96000, month: '2026-10' } });
      else if (fixtures && req.method === 'POST') {
        const body = await request.json();
        const board = body.handwriting ? ['8 + 3 = 11 ✓', '¡Muy bien!'] : body.action === 'continue' ? ['8 → 9, 10, 11', '8 + 3 = ?'] : ['8 + 3 = ?', '●●●●●●●● + ●●●'];
        const result = await runTutor(body, { OPENAI_API_KEY: 'fixture' }, async () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ visual: body.action === 'map' ? { type: 'map', title: 'La suma', branches: [{ label: 'Juntar', details: ['8 + 3 = 11'] }, { label: 'Contar', details: ['9, 10, 11'] }, { label: 'Orden', details: ['3 + 8 = 8 + 3'] }, { label: 'Problemas', details: ['¿Cuántos hay?'] }] } : body.action === 'draw' ? { type: 'sketch', title: '8 + 3', shapes: [...Array.from({ length: 8 }, (_, i) => ({ s: 'circle', x: 12 + (i % 4) * 14, y: 30 + Math.floor(i / 4) * 16, r: 5, color: 'blue', fill: true })), ...Array.from({ length: 3 }, (_, i) => ({ s: 'circle', x: 72 + i * 10, y: 38, r: 4, color: 'red', fill: true })), { s: 'line', x1: 10, y1: 70, x2: 90, y2: 70, arrow: true }, { s: 'text', x: 50, y: 88, text: '11 bolitas', size: 9 }, { s: 'ellipse', x: 50, y: 37, rx: 47, ry: 22, color: 'green' }, { s: 'poly', open: true, points: [[20, 76], [35, 82], [50, 84], [65, 82], [80, 76]], color: 'orange' }] } : null, summary: body.action === 'summary' || body.action === 'continue' ? ['Juntamos 8 y 3 fichas', 'Contamos hacia delante desde 8', '8 + 3 = 11'] : [], images: body.action === 'images' || body.mode === 'open' ? [{ query: 'Tigre de Bengala', label: 'El tigre de Bengala' }, { query: 'regletas de colores', label: 'Para sumar' }] : [], board, heard: body.handwriting ? '11' : '', reply: body.handwriting ? 'Escribiste 11. ¡Correcto! Ocho más tres son once.' : body.action === 'read' ? 'Revisa el texto de prueba.' : body.action === 'simpler' ? 'Imagina ocho fichas y añade tres. Este es el mismo paso con objetos.' : body.action === 'continue' ? 'Ahora cuenta tres fichas más desde ocho. ¿A qué número llegaste?' : 'Primero coloca ocho fichas. ¿Las tienes?', transcription: body.action === 'read' ? '8 + [?]' : '', needsRetake: body.action === 'read' }) }] }] }));
        // One fixture photo stands in for Wikipedia; the second search stays a link.
        const photos = result.images.length ? [{ ...result.images[0], url: '/__fixture-photo', width: 1000, height: 666, title: 'Tigre de Bengala', page: 'https://es.wikipedia.org/wiki/Panthera_tigris_tigris' }] : [];
        response = Response.json({ ...result, photos, account: { openMode: true, limit: 300000, used: 98500, month: '2026-10' } });
      } else response = await ({ GET, POST, OPTIONS }[req.method]?.(request) || new Response('', { status: 405 }));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    if (fixtures && url.pathname === '/__fixture-photo') {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' }); res.end(await readFile(process.env.FIXTURE_PHOTO || path.join(root, 'favicon.ico'))); return;
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep) && file !== root) throw Error('forbidden');
    let data, selected;
    for (const candidate of [file, file + '.html', path.join(file, 'index.html')]) {
      try { data = await readFile(candidate); selected = candidate; break; } catch { /* try next export shape */ }
    }
    if (!data) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(selected)] || 'application/octet-stream' }); res.end(data);
  } catch { res.writeHead(400); res.end('Invalid request'); }
}).listen(port, () => console.log(`Preview: http://localhost:${port}/tutor${fixtures ? ' — MOCK PROVIDERS, not real AI' : ''}`));
