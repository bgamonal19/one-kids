import test from 'node:test';
import assert from 'node:assert/strict';
import { linearEquation, verifyLinearQuestion } from '../server/assessment-math.mjs';
test('linear parser supports implicit multiplication, signs, parentheses and division without evaluation', () => {
  assert.deepEqual(linearEquation('4x - (x + 5)'), { a: 3, b: -5 });
  assert.deepEqual(linearEquation('2(x - 3)'), { a: 2, b: -6 });
  assert.deepEqual(linearEquation('-x/2 + 1'), { a: -0.5, b: 1 });
  for (const s of ['process.exit()', 'x*x', '1/0', '2(x', '2**3']) assert.equal(linearEquation(s), null);
});
test('verified equation fixes incorrect model answer and explanation', () => {
  const q = verifyLinearQuestion({ q: 'Para la ecuación 4x - (x + 5) = 7, el valor correcto de x es:', options: ['x = 4', 'x = 6', 'x = 7', 'x = 3'], answer: 1, why: '3x=12, x=6' });
  assert.equal(q.answer, 0); assert.match(q.why, /x = 4/); assert.doesNotMatch(q.why, /x=6/);
});
test('verified equation supplies an answer missing from generated choices', () => {
  const q = verifyLinearQuestion({ q: 'Si 4(x - 2) = 2x + 8, ¿cuánto vale x?', options: ['x = 6', 'x = 7', 'x = 4', 'x = 5'], answer: 0, why: 'mal' });
  assert.equal(q.options[q.answer], 'x = 8');
});
test('general questions remain available to the educational reviewer', () => {
  const q = { q: '¿Qué es una célula?', options: ['A', 'B', 'C', 'D'], answer: 0, why: 'Explicación' };
  assert.equal(verifyLinearQuestion(q), q);
});
