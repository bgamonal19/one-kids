import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { parseStudy, runStudy, validateStudyRequest, StudyError } from '../server/study-core.mjs';
import { POST } from '../api/study.mjs';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/study-plan.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { parseTopicList, mergeTopics, courseProgress, syllabusFor, completeTopic, passed, reportInput } = exports;
const plain = value => JSON.parse(JSON.stringify(value));
const env = { OPENAI_API_KEY: 'test-openai' };
const openai = value => Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { total_tokens: 900 } });
const lessonAnswer = { title: 'Fracciones', explain: 'Una fracción es una parte de un todo.', points: ['Numerador arriba'], example: 'Media pizza es 1/2.', quiz: [{ q: '¿1/2 es?', options: ['La mitad', 'El doble'], answer: 0, why: 'Dos partes iguales.' }, { q: 'Mala', options: ['a'], answer: 0 }, { q: 'Fuera', options: ['a', 'b'], answer: 5 }] };

test('topic list: one per line, month headers and month prefixes', () => {
  const topics = plain(parseTopicList('MARZO:\n1. Números hasta el 1000\n- Sumas llevando\n\nAbril - Fracciones; Decimales\nsetiembre\n• Geometría\nSumas llevando\nx'));
  assert.deepEqual(topics, [
    { title: 'Números hasta el 1000', month: 3 }, { title: 'Sumas llevando', month: 3 },
    { title: 'Fracciones', month: 4 }, { title: 'Decimales', month: 4 }, { title: 'Geometría', month: 9 },
  ]);
  assert.deepEqual(plain(parseTopicList('Los volcanes\nEl ciclo del agua')), [{ title: 'Los volcanes' }, { title: 'El ciclo del agua' }]);
  assert.equal(parseTopicList(Array.from({ length: 200 }, (_, i) => `Tema ${i}`).join('\n')).length, 80);
});
test('merging skips repeated titles and keeps order', () => {
  let n = 0;
  const merged = mergeTopics([{ id: 'a', title: 'Fracciones', done: true }], [{ title: 'fracciones' }, { title: 'Decimales', month: 5 }], () => `t${++n}`);
  assert.deepEqual(plain(merged), [{ id: 'a', title: 'Fracciones', done: true }, { id: 't1', title: 'Decimales', month: 5, done: false }]);
});
test('progress follows the syllabus in order and passing a quiz finishes the topic', () => {
  const course = { topics: [{ id: '1', title: 'A', done: true }, { id: '2', title: 'B', done: false, month: 10 }, { id: '3', title: 'C', done: false }] };
  const p = courseProgress(course, new Date(2026, 9, 26));
  assert.equal(p.percent, 33); assert.equal(p.current.title, 'B'); assert.deepEqual(plain(p.next.map(t => t.title)), ['C']); assert.equal(p.thisMonth.length, 1);
  assert.deepEqual(plain(syllabusFor(course)), { current: 'B', done: ['A'], next: ['C'] });
  assert.equal(passed(2, 3), true); assert.equal(passed(1, 3), false);
  const failed = completeTopic(course.topics, '2', { right: 1, total: 3 });
  assert.equal(failed[1].done, false); assert.deepEqual(plain(failed[1].score), { right: 1, total: 3 });
  const ok = completeTopic(course.topics, '2', { right: 3, total: 3 }, new Date('2026-10-26T10:00:00Z'));
  assert.equal(ok[1].done, true); assert.equal(ok[1].doneAt, '2026-10-26T10:00:00.000Z');
  assert.equal(courseProgress({ topics: [] }).current, null);
});
test('report input: pending always, done only in the period, never the child name', () => {
  const now = new Date('2026-10-26T18:00:00');
  const state = {
    child: { id: 'c', name: 'Luna', age: 9, stars: 0 },
    courses: [{ id: 'm', title: 'Matemáticas', desc: '', color: '', link: 'custom', topics: [{ id: '1', title: 'Fracciones', done: true, studiedAt: '2026-10-26T15:00:00', score: { right: 3, total: 3 } }, { id: '2', title: 'Decimales', done: false }] }],
    tasks: [
      { id: '1', title: 'Pág. 12', done: false, createdAt: '2026-10-01T10:00:00', courseId: 'm', dueDate: '2026-10-25', addedBy: 'parent' },
      { id: '2', title: 'Leer', done: true, createdAt: '2026-10-26T09:00:00', doneAt: '2026-10-26T17:00:00' },
      { id: '3', title: 'Antigua', done: true, createdAt: '2026-09-01T09:00:00', doneAt: '2026-09-02T09:00:00' },
    ],
  };
  const today = plain(reportInput(state, 'today', [{ at: '2026-10-26T16:00:00', course: '', topic: '8+3', summary: 'Sumó llevando.' }, { at: '2026-10-01T16:00:00', course: '', topic: 'x', summary: 'viejo' }], now));
  assert.deepEqual(today.tasks.map(t => t.title), ['Pág. 12', 'Leer']);
  assert.equal(today.tasks[0].course, 'Matemáticas');
  assert.deepEqual(today.courses[0], { title: 'Matemáticas', progress: '1/2', studied: [{ topic: 'Fracciones', done: true, score: '3/3' }], pending: ['Decimales'] });
  assert.deepEqual(today.notes.map(n => n.summary), ['Sumó llevando.']);
  assert.ok(!JSON.stringify(today).includes('Luna'));
  assert.equal(reportInput(state, 'all', [], now).tasks.length, 3);
});
test('requests are validated and bounded', () => {
  assert.throws(() => validateStudyRequest({ kind: 'lesson', course: 'Mates' }), StudyError);
  assert.throws(() => validateStudyRequest({ kind: 'otro' }), StudyError);
  assert.throws(() => validateStudyRequest({ kind: 'syllabus', imageBase64: 'http://x' }), StudyError);
  const lesson = validateStudyRequest({ kind: 'lesson', ageBand: '99', course: 'Mates', topic: 'Fracciones', done: Array(30).fill('x') });
  assert.equal(lesson.ageBand, '7-9'); assert.equal(lesson.done.length, 12);
  const report = validateStudyRequest({ kind: 'report', report: { period: 'week', age: 13, tasks: [{ title: 'a', done: true, addedBy: 'hacker' }, { title: '' }] } });
  assert.equal(report.tasks.length, 1); assert.equal(report.tasks[0].addedBy, ''); assert.equal(report.age, 13);
});
test('lesson: quiz items with bad answers are dropped; empty lessons fail', () => {
  const lesson = parseStudy(JSON.stringify(lessonAnswer), { kind: 'lesson', topic: 'x' });
  assert.equal(lesson.quiz.length, 1);
  assert.throws(() => parseStudy('{"explain":"x","quiz":[]}', { kind: 'lesson', topic: 'x' }), StudyError);
  assert.throws(() => parseStudy('no json', { kind: 'lesson', topic: 'x' }), StudyError);
  const read = parseStudy(JSON.stringify({ topics: ['Fracciones', { title: 'Decimales', month: 4 }, { title: 'Malo', month: 13 }] }), { kind: 'syllabus' });
  assert.deepEqual(read.topics, [{ title: 'Fracciones', month: null }, { title: 'Decimales', month: 4 }, { title: 'Malo', month: null }]);
  assert.equal(parseStudy('{"topics":[]}', { kind: 'syllabus' }).unreadable, true);
});
test('runStudy sends the syllabus context with JSON format and returns tokens', async () => {
  let sent;
  const result = await runStudy({ kind: 'lesson', ageBand: '13-16', course: 'Ciencias', topic: 'Célula', done: ['Seres vivos'], next: ['Tejidos'] }, env, async (url, options) => { sent = JSON.parse(options.body); return openai(lessonAnswer); });
  assert.equal(result.tokens, 900); assert.equal(result.kind, 'lesson');
  const text = sent.input[0].content[0].text;
  assert.match(text, /Seres vivos/); assert.match(text, /Tejidos/); assert.match(text, /JSON/);
  assert.match(sent.instructions, /secundaria/);
  assert.equal(sent.store, false);
  await assert.rejects(runStudy({ kind: 'lesson', course: 'a', topic: 'b' }, {}, () => { throw Error('no'); }), e => e.status === 503);
});
test('report prompt never invents and the photo goes to the model as an image', async () => {
  let sent;
  await runStudy({ kind: 'report', report: { period: 'today', age: 8, tasks: [{ title: 'Leer', done: false }] }, question: '¿Cómo va?' }, env, async (_, o) => { sent = JSON.parse(o.body); return openai({ summary: 'Va bien.', done: [], pending: ['Leer'], tips: [] }); });
  assert.match(sent.instructions, /No inventes/); assert.match(sent.input[0].content[0].text, /¿Cómo va\?/);
  await runStudy({ kind: 'syllabus', imageBase64: 'data:image/jpeg;base64,/9j/2Q==', course: 'Mates' }, env, async (_, o) => { sent = JSON.parse(o.body); return openai({ topics: ['Sumas'] }); });
  assert.equal(sent.input[0].content[0].type, 'input_image');
});
test('HTTP: JSON only, rejects other origins, reports provider missing honestly', async () => {
  const req = (body, headers = {}) => new Request('https://one-kids.vercel.app/api/study', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });
  assert.equal((await POST(req('x', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await POST(req('{}', { origin: 'https://evil.example' }))).status, 403);
  const saved = { ...process.env };
  delete process.env.OPENAI_API_KEY; delete process.env.ANTHROPIC_API_KEY; delete process.env.TUTOR_REQUIRE_ACCOUNT;
  try {
    const response = await POST(req(JSON.stringify({ kind: 'lesson', course: 'a', topic: 'b' }), { 'x-real-ip': '1.1.1.1' }));
    assert.equal(response.status, 503);
  } finally { Object.assign(process.env, saved); }
});
