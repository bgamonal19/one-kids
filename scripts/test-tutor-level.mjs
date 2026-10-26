import test from 'node:test';
import assert from 'node:assert/strict';
import { ageLevel, runTutor, validateTutorRequest } from '../server/tutor-core.mjs';

const capture = () => {
  const seen = {};
  seen.fetcher = async (url, init) => { seen.body = JSON.parse(init.body); return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ reply: 'Hola', board: ['Hola'] }) }] }] }); };
  return seen;
};

test('the level of detail grows every two years, detailed from 13', () => {
  const levels = [5, 7, 9, 11, 13, 15].map(ageLevel);
  assert.equal(new Set(levels).size, 6);
  assert.equal(ageLevel(7), ageLevel(8));
  assert.equal(ageLevel(13), ageLevel(14));
  assert.match(ageLevel(13), /fotos reales de internet/);
  assert.match(ageLevel(13), /bocetos detallados/);
  assert.doesNotMatch(ageLevel(9), /secundaria/);
});

test('exact age falls back to the band and is bounded', () => {
  assert.equal(validateTutorRequest({ ageBand: '13-16', message: 'x' }).age, 14);
  assert.equal(validateTutorRequest({ ageBand: '7-9', age: 13, message: 'x' }).age, 13);
  assert.equal(validateTutorRequest({ ageBand: '7-9', age: 40, message: 'x' }).age, 8);
});

test('teenagers get detailed answers with more room', async () => {
  const seen = capture();
  await runTutor({ ageBand: '13-16', age: 13, message: 'la revolución francesa' }, { OPENAI_API_KEY: 'k' }, seen.fetcher);
  assert.equal(seen.body.max_output_tokens, 4000);
  assert.match(seen.body.instructions, /13 años/);
  assert.match(seen.body.instructions, /profesor de secundaria/);
  await runTutor({ ageBand: '7-9', age: 7, message: '8 + 3' }, { OPENAI_API_KEY: 'k' }, seen.fetcher);
  assert.equal(seen.body.max_output_tokens, 2400);
});

test('essays and theses are guided step by step and summarized at the end', async () => {
  const seen = capture();
  await runTutor({ ageBand: '10-12', message: 'tengo que hacer un ensayo' }, { OPENAI_API_KEY: 'k' }, seen.fetcher);
  assert.match(seen.body.instructions, /Ensayos, tesis/);
  assert.match(seen.body.instructions, /RESUMEN de todo/);
});

test('the tutor remembers earlier work and the syllabus of the course', async () => {
  const seen = capture();
  const memory = [{ at: '2026-10-20T10:00:00Z', topic: 'Los incas', summary: 'Vimos Machu Picchu y el Tahuantinsuyo.' }];
  await runTutor({ ageBand: '10-12', message: 'la conquista', courseTitle: 'Historia', memory, syllabus: { current: 'La conquista', done: ['Los incas'], next: ['El virreinato'] } }, { OPENAI_API_KEY: 'k' }, seen.fetcher);
  assert.match(seen.body.instructions, /Curso actual: «Historia»/);
  assert.match(seen.body.instructions, /2026-10-20: Los incas — Vimos Machu Picchu/);
  assert.match(seen.body.instructions, /Recuerdas cuando vimos/);
  assert.match(seen.body.instructions, /Tema actual: La conquista/);
  assert.match(seen.body.instructions, /Próximos: El virreinato/);
  await runTutor({ ageBand: '10-12', message: 'hola', memory }, { OPENAI_API_KEY: 'k' }, seen.fetcher);
  assert.doesNotMatch(seen.body.instructions, /Los incas/);
});
