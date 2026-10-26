import test from 'node:test';
import assert from 'node:assert/strict';

// lib/course-memory.ts is TypeScript with an AsyncStorage import; test its pure logic on a copy.
const { addMemory, courseEntries } = await (async () => {
  const fs = await import('node:fs');
  const ts = await import('typescript');
  const src = fs.readFileSync(new URL('../lib/course-memory.ts', import.meta.url), 'utf8').replace(/^import .*$/m, 'const AsyncStorage = {};');
  const js = ts.default.transpileModule(src, { compilerOptions: { module: ts.default.ModuleKind.ESNext, target: ts.default.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(js)}`);
})();

test('one entry per topic, the latest wins and keeps the older summary if it has none', () => {
  let memory = addMemory([], { at: '1', courseId: 'h', topic: 'Los incas', summary: 'Resumen' });
  memory = addMemory(memory, { at: '2', courseId: 'm', topic: 'Fracciones', summary: '' });
  memory = addMemory(memory, { at: '3', courseId: 'h', topic: 'los incas', summary: '' });
  assert.equal(memory.length, 2);
  assert.deepEqual(courseEntries(memory, 'h'), [{ at: '3', courseId: 'h', topic: 'los incas', summary: 'Resumen' }]);
});

test('each course keeps its latest 30 topics', () => {
  let memory = [];
  for (let i = 0; i < 35; i++) memory = addMemory(memory, { at: String(i), courseId: 'h', topic: `T${i}`, summary: '' });
  memory = addMemory(memory, { at: 'x', courseId: 'm', topic: 'Otro', summary: '' });
  assert.equal(courseEntries(memory, 'h', 100).length, 30);
  assert.equal(courseEntries(memory, 'h', 100)[0].topic, 'T5');
  assert.equal(courseEntries(memory, 'h').length, 12);
  assert.equal(courseEntries(memory, 'm').length, 1);
});
