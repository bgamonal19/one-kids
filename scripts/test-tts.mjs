import test from 'node:test';
import assert from 'node:assert/strict';
import { runTts, ttsTokens, validateTtsRequest, TtsError } from '../server/tts-core.mjs';
import { POST } from '../api/tts.mjs';

test('voice requests are cleaned and limited to known voices', () => {
  assert.deepEqual(validateTtsRequest({ text: '  **Hola**   niño ', voice: 'coral', age: 7 }), { text: 'Hola niño', voice: 'coral', age: 7 });
  assert.equal(validateTtsRequest({ text: 'x'.repeat(5000), voice: 'nova' }).text.length, 1500);
  assert.equal(validateTtsRequest({ text: 'Hola', voice: 'nova', age: 99 }).age, 8);
  assert.throws(() => validateTtsRequest({ text: 'Hola', voice: 'robot' }), TtsError);
  assert.throws(() => validateTtsRequest({ text: '   ', voice: 'coral' }), TtsError);
});

test('runTts calls OpenAI speech with a warm Spanish style and meters the audio', async () => {
  let sent;
  const result = await runTts({ text: 'Ocho más tres', voice: 'coral', age: 6 }, { OPENAI_API_KEY: 'k' }, async (url, init) => { sent = { url, init }; return new Response(new Uint8Array([1, 2, 3])); });
  const body = JSON.parse(sent.init.body);
  assert.equal(sent.url, 'https://api.openai.com/v1/audio/speech');
  assert.equal(sent.init.headers.Authorization, 'Bearer k');
  assert.equal(body.model, 'gpt-4o-mini-tts');
  assert.equal(body.voice, 'coral');
  assert.match(body.instructions, /español/);
  assert.match(body.instructions, /6 años/);
  assert.equal(result.audio.byteLength, 3);
  assert.equal(result.tokens, ttsTokens('Ocho más tres'));
});

test('runTts reports a missing key and provider failures', async () => {
  await assert.rejects(runTts({ text: 'Hola', voice: 'coral' }, {}), e => e.status === 503);
  await assert.rejects(runTts({ text: 'Hola', voice: 'coral' }, { OPENAI_API_KEY: 'k' }, async () => new Response('no', { status: 500 })), e => e.status === 502);
});

test('the voice endpoint requires an account when the tutor does', async () => {
  const keys = ['TUTOR_REQUIRE_ACCOUNT', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
  const previous = keys.map(k => process.env[k]);
  Object.assign(process.env, { TUTOR_REQUIRE_ACCOUNT: 'true', SUPABASE_URL: 'https://db.test', SUPABASE_PUBLISHABLE_KEY: 'pk' });
  try {
    const response = await POST(new Request('https://app.test/api/tts', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://app.test' }, body: JSON.stringify({ text: 'Hola', voice: 'coral' }) }));
    assert.equal(response.status, 401);
  } finally {
    keys.forEach((k, i) => { if (previous[i] === undefined) delete process.env[k]; else process.env[k] = previous[i]; });
  }
});

test('the voice endpoint rejects other origins and bad JSON', async () => {
  assert.equal((await POST(new Request('https://app.test/api/tts', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.test' }, body: '{}' }))).status, 403);
  assert.equal((await POST(new Request('https://app.test/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' }))).status, 400);
});
