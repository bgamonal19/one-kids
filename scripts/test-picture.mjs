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

test('only free mode replies carry a picture request', async () => {
  const fetcher = async () => Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Aquí tienes una rana', board: ['Rana'], picture: { prompt: 'A frog', label: 'Rana' } }) }] }] });
  const open = await runTutor({ ageBand: '7-9', message: 'dibújame una rana', mode: 'open' }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.deepEqual(open.picture, { prompt: 'A frog', label: 'Rana', style: 'photo' });
  const tutor = await runTutor({ ageBand: '7-9', message: 'dibújame una rana' }, { OPENAI_API_KEY: 'k' }, fetcher);
  assert.equal(tutor.picture, null);
});

test('the picture endpoint is refused without free mode', async () => {
  const response = await POST(new Request('https://app.test/api/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ picture: { prompt: 'A frog' } }) }));
  assert.equal(response.status, 403);
});
