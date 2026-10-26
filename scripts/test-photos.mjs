import test from 'node:test';
import assert from 'node:assert/strict';
import { findPhotos } from '../server/photos-core.mjs';
import { cleanVisual, runTutor } from '../server/tutor-core.mjs';

const wiki = pages => Response.json({ query: { pages } });

test('photos come from the lead image of the best Wikipedia result', async () => {
  const urls = [];
  const photos = await findPhotos([{ query: 'Tigre de Bengala', label: 'Un tigre' }], async url => {
    urls.push(String(url));
    return wiki([
      { index: 2, title: 'Tigre', fullurl: 'https://es.wikipedia.org/wiki/Tigre', thumbnail: { source: 'https://upload.wikimedia.org/b.jpg', width: 1000, height: 700 } },
      { index: 1, title: 'Tigre de Bengala', fullurl: 'https://es.wikipedia.org/wiki/Tigre_de_Bengala', thumbnail: { source: 'https://upload.wikimedia.org/a.jpg', width: 1000, height: 666 } },
    ]);
  });
  assert.match(urls[0], /^https:\/\/es\.wikipedia\.org\/w\/api\.php\?/);
  assert.match(urls[0], /pilicense=free/);
  assert.deepEqual(photos, [{ query: 'Tigre de Bengala', label: 'Un tigre', url: 'https://upload.wikimedia.org/a.jpg', width: 1000, height: 666, title: 'Tigre de Bengala', page: 'https://es.wikipedia.org/wiki/Tigre_de_Bengala' }]);
});

test('falls back to English Wikipedia and drops searches without a free picture', async () => {
  const photos = await findPhotos([{ query: 'Saturn', label: '' }, { query: 'nada', label: '' }], async url => {
    const u = String(url);
    if (u.includes('gsrsearch=Saturn') && u.startsWith('https://en.')) return wiki([{ index: 1, title: 'Saturn', fullurl: 'https://en.wikipedia.org/wiki/Saturn', thumbnail: { source: 'https://upload.wikimedia.org/s.png', width: 800, height: 800 } }]);
    if (u.includes('gsrsearch=nada')) throw new Error('offline');
    return wiki([{ index: 1, title: 'Sin foto', fullurl: 'https://es.wikipedia.org/wiki/x' }]);
  });
  assert.equal(photos.length, 1);
  assert.equal(photos[0].url, 'https://upload.wikimedia.org/s.png');
});

test('only upload.wikimedia.org pictures are accepted', async () => {
  const photos = await findPhotos([{ query: 'x', label: '' }], async () => wiki([{ index: 1, title: 'X', thumbnail: { source: 'https://evil.test/x.jpg' } }]));
  assert.deepEqual(photos, []);
});

test('sketches support ellipses, open curves and up to 80 shapes when asked', () => {
  const shapes = [{ s: 'ellipse', x: 50, y: 50, rx: 30, ry: 10, color: 'green', fill: true }, { s: 'poly', open: true, points: [[0, 0], [10, 5], [20, 0]] }, ...Array.from({ length: 100 }, (_, i) => ({ s: 'circle', x: i % 100, y: 10, r: 2 }))];
  const big = cleanVisual({ type: 'sketch', title: 'Rana', shapes }, 80);
  assert.equal(big.shapes.length, 80);
  assert.deepEqual(big.shapes[0], { s: 'ellipse', x: 50, y: 50, rx: 30, ry: 10, color: 'green', fill: true });
  assert.equal(big.shapes[1].open, true);
  assert.equal(cleanVisual({ type: 'sketch', title: 'Rana', shapes }).shapes.length, 40);
});

test('free mode asks for rich answers, Wikipedia photos and detailed sketches with more room', async () => {
  let body;
  const fetcher = async (url, init) => { body = JSON.parse(init.body); return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hola', board: ['Hola'] }) }] }] }); };
  await runTutor({ ageBand: '7-9', message: 'muéstrame un tigre', mode: 'open', pictures: true }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.equal(body.max_output_tokens, 4000);
  assert.match(body.instructions, /Wikipedia/);
  assert.match(body.instructions, /"picture":null/);
  assert.match(body.instructions, /imagen realista/);
  assert.match(body.instructions, /hasta 80 formas/);
  await runTutor({ ageBand: '7-9', message: 'qué es la fotosíntesis' }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.equal(body.max_output_tokens, 2400);
  assert.match(body.instructions, /de 5 a 10 frases/);
});
