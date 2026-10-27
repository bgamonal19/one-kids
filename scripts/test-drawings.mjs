import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { mapSketch, attachMap } from '../server/geo-core.mjs';
import { traceDrawing } from '../server/trace-core.mjs';
import { runPicture } from '../server/picture-core.mjs';
import { cleanVisual, runTutor } from '../server/tutor-core.mjs';

// A small white picture with a black line across the top and an orange square below it.
function drawing() {
  const width = 100, height = 100, data = Buffer.alloc(width * height * 4, 255);
  const paint = (x, y, [r, g, b]) => { const i = (y * width + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; };
  for (let x = 10; x < 90; x++) for (let y = 10; y < 13; y++) paint(x, y, [0, 0, 0]);
  for (let x = 30; x < 70; x++) for (let y = 40; y < 80; y++) paint(x, y, [240, 140, 30]);
  return jpeg.encode({ width, height, data }, 95).data.toString('base64');
}

test('real maps trace the country outlines and colour the countries the tutor names', () => {
  const world = mapSketch({ region: 'world', countries: [{ name: 'Ucrania', label: 'Ucrania', color: 'red' }, { name: 'Syria', label: 'Siria', color: 'orange' }, { name: 'Yemen' }, { name: 'Afganistán', color: 'blue' }] });
  assert.ok(world.trace.rings.length > 100);
  // Wider than tall, with a colour key under the map because the names would overlap.
  assert.ok(world.aspect < 1);
  assert.deepEqual(world.shapes.filter(s => s.s === 'text').map(s => s.text), ['Ucrania', 'Siria', 'Yemen', 'Afganistán']);
  assert.ok(world.shapes.some(s => s.s === 'poly' && s.color === 'red' && s.fill));
  // Every traced point stays inside the frame: nothing is dragged along its edges.
  for (const ring of world.trace.rings) for (const [x, y] of ring) assert.ok(x >= -0.5 && x <= 100.5 && y >= -0.5 && y <= world.aspect * 100 + 0.5);
  // A country name zooms in on it and its name goes on top of it.
  const peru = mapSketch({ region: 'Perú', countries: [{ name: 'Perú', label: 'Perú', color: 'green' }] });
  const label = peru.shapes.find(s => s.s === 'text');
  assert.equal(label.text, 'Perú'); assert.ok(label.x > 20 && label.x < 80);
  assert.equal(mapSketch({ region: 'Atlantis' }), null);
  const sketch = attachMap({ type: 'sketch', title: 'Mapa', shapes: [{ s: 'line', x1: 0, y1: 0, x2: 9, y2: 9, arrow: true, color: 'red', fill: false }], geo: { region: 'europe', countries: [{ name: 'Spain', label: 'España' }] } });
  assert.equal(sketch.geo, undefined); assert.ok(sketch.trace.rings.length); assert.equal(sketch.shapes.at(-1).s, 'line');
});

test('a line drawing is revealed by pen strokes first, then coloured in', () => {
  const { rings, fills } = traceDrawing(drawing());
  assert.ok(rings.length >= 1);
  assert.ok(rings.flat().every(([, y]) => y < 20), 'the black line is a pen stroke');
  assert.ok(fills.length >= 1);
  assert.ok(fills.flat().every(([, y]) => y > 35), 'the orange square is coloured in');
});

test('whiteboard drawings ask for line art and return the strokes with the image', async () => {
  let prompt;
  const result = await runPicture({ prompt: 'a lion', label: 'León', style: 'line' }, { OPENAI_API_KEY: 'k' }, async (_, init) => { prompt = JSON.parse(init.body).prompt; return Response.json({ data: [{ b64_json: drawing() }] }); });
  assert.match(prompt, /whiteboard animation/); assert.match(prompt, /black ink outlines/);
  assert.ok(result.trace.rings.length); assert.equal(result.trace.image, result.photo.url);
  // A broken image still returns the picture, just without strokes.
  const broken = await runPicture({ prompt: 'a lion', style: 'line' }, { OPENAI_API_KEY: 'k' }, async () => Response.json({ data: [{ b64_json: 'QUJD' }] }));
  assert.deepEqual(broken.trace.rings, []);
});

test('the tutor can ask for a real map or a whiteboard drawing; drawings only when pictures are metered', async () => {
  assert.equal(cleanVisual({ type: 'sketch', title: 'León', illustration: 'a lion', shapes: [] }), null);
  const lion = cleanVisual({ type: 'sketch', title: 'León', illustration: 'a lion https://x.y', shapes: [] }, 40, { pictures: true, age: 7 });
  assert.match(lion.illustration, /^simple cute cartoon.*: a lion$/);
  assert.match(cleanVisual({ type: 'sketch', title: 'Célula', illustration: 'an animal cell', shapes: [] }, 40, { pictures: true, age: 14 }).illustration, /detailed/);
  const map = cleanVisual({ type: 'sketch', title: 'Mapa', geo: { region: 'world', countries: [{ name: 'Ukraine', label: 'Ucrania', color: 'evil' }, { label: 'sin nombre' }] }, shapes: [] });
  assert.deepEqual(map.geo, { region: 'world', countries: [{ name: 'Ukraine', label: 'Ucrania', color: 'red' }] });
  let instructions;
  await runTutor({ ageBand: '9-10', age: 10, message: 'dibújame un león', provider: 'openai', pictures: true }, { OPENAI_API_KEY: 'k' }, async (_, init) => { instructions = JSON.parse(init.body).instructions; return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Mira', board: ['León'], visual: null }) }] }] }); });
  assert.match(instructions, /"geo"/); assert.match(instructions, /"illustration"/);
  await runTutor({ ageBand: '9-10', age: 10, message: 'dibújame un león', provider: 'openai' }, { OPENAI_API_KEY: 'k' }, async (_, init) => { instructions = JSON.parse(init.body).instructions; return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Mira', board: ['León'], visual: null }) }] }] }); });
  assert.match(instructions, /"geo"/); assert.doesNotMatch(instructions, /"illustration"/);
});

test('generated illustrations replace primitive drafts instead of layering both drawings', () => {
  const shape = { s: 'circle', x: 50, y: 50, r: 20 };
  const generated = cleanVisual({ type: 'sketch', title: 'León', illustration: 'A detailed lion', shapes: [shape] }, 40, { pictures: true });
  assert.deepEqual(generated.shapes, []);
  assert.ok(generated.illustration);
  const diagram = cleanVisual({ type: 'sketch', title: 'Círculo', shapes: [shape] });
  assert.equal(diagram.shapes.length, 1);
  const annotated = cleanVisual({ type: 'sketch', title: 'León', photo: 'León', shapes: [shape] }, 40, { pictures: true });
  assert.equal(annotated.shapes.length, 1);
});
