import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPicture, runPicture, PICTURE_TOKENS } from '../server/picture-core.mjs';
import { runTutor } from '../server/tutor-core.mjs';
import { POST } from '../api/tutor.mjs';

test('picture requests are cleaned', () => {
  assert.equal(cleanPicture(null), null);
  assert.equal(cleanPicture({ prompt: ' ' }), null);
  assert.deepEqual(cleanPicture({ prompt: 'A green frog on a leaf https://x.test', label: 'Una rana', style: 'sketch' }), { prompt: 'A green frog on a leaf', label: 'Una rana', style: 'sketch' });
  assert.equal(cleanPicture({ prompt: 'A frog', style: 'weird' }).style, 'photo');
});

test('runPicture asks OpenAI for a cheap, kid-safe image and returns a data URL', async () => {
  let sent;
  const result = await runPicture({ prompt: 'A green frog on a leaf', label: 'Una rana' }, { OPENAI_API_KEY: 'k' }, async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return Response.json({ data: [{ b64_json: 'QUJD' }] }); });
  assert.equal(sent.url, 'https://api.openai.com/v1/images/generations');
  assert.equal(sent.body.model, 'gpt-image-1-mini');
  assert.equal(sent.body.quality, 'low');
  assert.equal(sent.body.size, '1024x1024');
  assert.equal(sent.body.output_format, 'jpeg');
  assert.match(sent.body.prompt, /safe for kids/);
  assert.match(sent.body.prompt, /A green frog on a leaf/);
  assert.equal(result.photo.url, 'data:image/jpeg;base64,QUJD');
  assert.equal(result.photo.generated, true);
  assert.equal(result.tokens, PICTURE_TOKENS);
});

test('runPicture reports missing key and provider errors', async () => {
  await assert.rejects(runPicture({ prompt: 'A frog' }, {}), e => e.status === 503);
  await assert.rejects(runPicture({ prompt: 'A frog' }, { OPENAI_API_KEY: 'k' }, async () => new Response('no', { status: 400 })), e => e.status === 502);
});

test('photos only when the child asks for one; drawings are traced as a sketch', async () => {
  let instructions;
  const reply = { reply: 'Aquí tienes una foto de una rana', board: ['Rana'], picture: { prompt: 'A frog', label: 'Rana' } };
  const fetcher = answer => async (url, init) => { instructions = JSON.parse(init.body).instructions; return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }); };
  const tutor = await runTutor({ ageBand: '7-9', message: 'muéstrame una foto de una rana', pictures: true }, { OPENAI_API_KEY: 'k' }, fetcher(reply));
  assert.deepEqual(tutor.picture, { prompt: 'A frog', label: 'Rana', style: 'photo' });
  assert.match(instructions, /SOLO cuando el niño pida expresamente una foto/);
  assert.match(instructions, /trazo a trazo/);
  const open = await runTutor({ ageBand: '7-9', message: 'una foto de una rana', mode: 'open', pictures: true }, { OPENAI_API_KEY: 'k' }, fetcher(reply));
  assert.equal(open.picture.prompt, 'A frog');
  const off = await runTutor({ ageBand: '7-9', message: 'una foto de una rana', mode: 'open' }, { OPENAI_API_KEY: 'k' }, fetcher(reply));
  assert.equal(off.picture, null);
  assert.doesNotMatch(instructions, /"picture":null/);
  // "Dibújame" gets the traced sketch even if the model also asked for a picture.
  const sketch = { type: 'sketch', title: 'Rana', shapes: [{ s: 'ellipse', x: 50, y: 50, rx: 30, ry: 20, color: 'green' }] };
  const drawn = await runTutor({ ageBand: '7-9', message: 'dibújame una rana', pictures: true }, { OPENAI_API_KEY: 'k' }, fetcher({ ...reply, visual: sketch }));
  assert.equal(drawn.picture, null);
  assert.equal(drawn.visual.type, 'sketch');
});

test('a photo is made anyway when the tutor promises one but leaves it empty', async () => {
  const { fallbackPicture } = await import('../server/tutor-core.mjs');
  const lion = fallbackPicture({ message: 'no lo veo' }, 'Aquí tienes una foto realista de un león.', ['León: melena grande']);
  assert.equal(lion.label, 'León: melena grande');
  assert.match(lion.prompt, /león/);
  assert.match(fallbackPicture({ message: 'quiero una foto de un tigre' }, 'Mira.', ['Tigre']).prompt, /^un tigre/);
  assert.equal(fallbackPicture({ message: 'dibújame una rana' }, 'Las ranas son anfibios.', ['Rana']), null);
  assert.equal(fallbackPicture({ message: 'cuánto es 8 + 3' }, 'Vamos a sumar.', ['8 + 3']), null);
});

test('drawings grow from simple cartoons to detailed structures with age', async () => {
  const { drawLevel } = await import('../server/tutor-core.mjs');
  assert.match(drawLevel(6), /caricatura simple/);
  assert.match(drawLevel(10), /proporciones correctas/);
  assert.match(drawLevel(13), /estructura/);
  let body;
  const fetcher = async (url, init) => { body = JSON.parse(init.body); return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hola', board: ['Hola'] }) }] }] }); };
  await runTutor({ ageBand: '13-16', age: 14, message: 'dibújame una célula' }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.match(body.instructions, /hasta 120 formas/);
  assert.equal(body.max_output_tokens, 5000);
  assert.match(body.instructions, /especialista en ciencias/);
});
