import test from 'node:test';
import assert from 'node:assert/strict';
import { findPhotos, titleMatches } from '../server/photos-core.mjs';
import { cleanVisual, runTutor } from '../server/tutor-core.mjs';

const wiki = pages => Response.json({ query: { pages } });

test('photos come from the lead image of the article with that exact name', async () => {
  const urls = [];
  const photos = await findPhotos([{ query: 'Tigre de Bengala', label: 'Un tigre' }], async url => {
    urls.push(String(url));
    return wiki([{ title: 'Tigre de Bengala', fullurl: 'https://es.wikipedia.org/wiki/Tigre_de_Bengala', thumbnail: { source: 'https://upload.wikimedia.org/a.jpg', width: 1000, height: 666 } }]);
  });
  assert.match(urls[0], /^https:\/\/es\.wikipedia\.org\/w\/api\.php\?/);
  assert.match(urls[0], /pilicense=free/); assert.match(urls[0], /titles=Tigre/);
  assert.deepEqual(photos, [{ query: 'Tigre de Bengala', label: 'Un tigre', url: 'https://upload.wikimedia.org/a.jpg', width: 1000, height: 666, title: 'Tigre de Bengala', page: 'https://es.wikipedia.org/wiki/Tigre_de_Bengala' }]);
});

test('a search result is only used when its title is what was asked (never a person who shares a word)', async () => {
  const search = pages => async url => String(url).includes('titles=') ? wiki([{ title: 'x', missing: true }]) : wiki(pages);
  const whack = { index: 1, title: 'Tierra Whack', fullurl: 'https://es.wikipedia.org/wiki/Tierra_Whack', thumbnail: { source: 'https://upload.wikimedia.org/person.jpg', width: 800, height: 1000 } };
  const earth = { index: 2, title: 'Tierra', fullurl: 'https://es.wikipedia.org/wiki/Tierra', thumbnail: { source: 'https://upload.wikimedia.org/earth.jpg', width: 1000, height: 1000 } };
  const found = await findPhotos([{ query: 'La Tierra vista desde el espacio', label: 'La Tierra' }], search([whack, earth]));
  assert.equal(found[0].url, 'https://upload.wikimedia.org/earth.jpg');
  assert.deepEqual(await findPhotos([{ query: 'La Tierra vista desde el espacio', label: 'La Tierra' }], search([whack])), []);
  // A disambiguation page is never a picture.
  assert.deepEqual(await findPhotos([{ query: 'Mercurio', label: '' }], async () => wiki([{ title: 'Mercurio', pageprops: { disambiguation: '' }, thumbnail: { source: 'https://upload.wikimedia.org/m.jpg' } }])), []);
  assert.ok(titleMatches('Tigres', 'los tigre')); assert.ok(!titleMatches('Planeta Tierra', 'Tierra'));
});

test('falls back to English Wikipedia and drops searches without a free picture', async () => {
  const photos = await findPhotos([{ query: 'Saturn', label: '' }, { query: 'nada', label: '' }], async url => {
    const u = String(url);
    if ((u.includes('gsrsearch=Saturn') || u.includes('titles=Saturn')) && u.startsWith('https://en.')) return wiki([{ index: 1, title: 'Saturn', fullurl: 'https://en.wikipedia.org/wiki/Saturn', thumbnail: { source: 'https://upload.wikimedia.org/s.png', width: 800, height: 800 } }]);
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
  assert.match(body.instructions, /Fotos realistas/);
  assert.match(body.instructions, /hasta 80 formas/);
  await runTutor({ ageBand: '7-9', message: 'qué es la fotosíntesis' }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.equal(body.max_output_tokens, 2400);
  assert.match(body.instructions, /de 5 a 10 frases/);
});

test('an annotated sketch gets its Wikipedia photo as background, or stays a plain drawing', async () => {
  const { attachBackground } = await import('../server/photos-core.mjs');
  const { cleanVisual } = await import('../server/tutor-core.mjs');
  const sketch = cleanVisual({ type: 'sketch', title: 'Perú', photo: 'Perú https://x.y', shapes: [{ s: 'text', x: 50, y: 50, text: 'Lima' }] });
  assert.equal(sketch.photo, 'Perú');
  const found = async () => Response.json({ query: { pages: [{ title: 'Perú', index: 1, thumbnail: { source: 'https://upload.wikimedia.org/peru.png', width: 800, height: 1000 } }] } });
  const withPhoto = await attachBackground(sketch, found);
  assert.equal(withPhoto.background.url, 'https://upload.wikimedia.org/peru.png');
  assert.equal(withPhoto.photo, undefined);
  const none = await attachBackground(sketch, async () => Response.json({ query: { pages: [] } }));
  assert.equal(none.background, undefined); assert.equal(none.photo, undefined); assert.equal(none.shapes.length, 1);
  assert.equal(await attachBackground(null), null);
});
