import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/board-flow.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { packBoard, explicitNewTopic } = exports;
const plain = value => JSON.parse(JSON.stringify(value));
test('fills the gap beside a tall earlier explanation without fixed columns', () => {
  const result = packBoard([{ id: 'drawing', width: 540, height: 500 }, { id: 'explanation', width: 442, height: 100 }, { id: 'followup', width: 442, height: 150 }], 1000);
  assert.deepEqual(plain(result.map(({ id, x, y }) => ({ id, x, y }))), [
    { id: 'drawing', x: 0, y: 0 }, { id: 'explanation', x: 558, y: 0 }, { id: 'followup', x: 558, y: 118 },
  ]);
});
test('phone content keeps its sequence and continues below the visible board', () => {
  const result = packBoard(Array.from({ length: 20 }, (_, i) => ({ id: String(i), width: 330, height: 100 })), 330);
  assert.equal(result.length, 20); assert.equal(result.at(-1).y, 19 * 118);
  assert.ok(result.every(r => r.x === 0 && r.width === 330));
});
test('resizing and late picture heights never overlap or leave the surface horizontally', () => {
  for (const width of [280, 640, 1000]) for (const extra of [0, 200]) {
    const items = Array.from({ length: 40 }, (_, i) => ({ id: String(i), width: i % 3 ? width * .4 : width * .55, height: 40 + (i * 47 % 200) + (i === 3 ? extra : 0) }));
    const rectangles = packBoard(items, width);
    assert.deepEqual(plain(rectangles.map(r => r.id)), items.map(r => r.id));
    for (const [i, a] of rectangles.entries()) {
      assert.ok(a.x >= 0 && a.x + a.width <= width + .5);
      for (const b of rectangles.slice(i + 1)) assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.id} overlaps ${b.id}`);
    }
  }
});
test('follow-up questions, hints and drawings do not start a new topic', () => {
  for (const action of ['continue', 'draw', 'example', 'hint', 'map', 'summary', 'simpler']) assert.equal(explicitNewTopic(action, 'Nuevo tema'), false);
  assert.equal(explicitNewTopic('help', '¿Por qué ocurre?'), false);
  assert.equal(explicitNewTopic('help', 'Cambiemos de tema: los volcanes'), true);
});

test('additions modify an existing scene while new themes remain separate', () => {
  const edits = exports.editsExistingDrawing;
  for (const message of ['Agrégale un árbol a la derecha', 'Añade un sol encima', 'Ponle una corona', 'Dibuja una nube sobre el lago']) assert.equal(edits(message), true, message);
  for (const message of ['Agrega más temas', 'Quiero otro dibujo', 'Añade una explicación', 'Cambiemos de tema']) assert.equal(edits(message), false, message);
  assert.equal(exports.BOARD_READING_MS, 5000);
  assert.equal(exports.BOARD_DRAWING_MS, 11000);
});

test('restoring General never inherits the last course and each subject resumes its own board', () => {
  const boards = [{ id: 'general' }, { id: 'math', courseId: 'math' }, { id: 'science', courseId: 'science' }];
  assert.equal(exports.latestCourseBoard(boards)?.id, 'general');
  assert.equal(exports.latestCourseBoard(boards, 'math')?.id, 'math');
  assert.equal(exports.latestCourseBoard(boards, 'new'), undefined);
});
test('compact explanations pack four across desktop and remain within phone bounds', () => {
  for (const width of [260, 330, 700, 1100]) {
    const size = exports.compactBoardSize(width, 32);
    const cards = packBoard(Array.from({ length: 20 }, (_, i) => ({ id: String(i), width: size.width, height: 70 })), width, 12);
    assert.ok(cards.every(c => c.x >= 0 && c.x + c.width <= width));
    assert.ok(size.font >= 12);
    if (width === 1100) assert.equal(cards.filter(c => c.y === 0).length, 4);
  }
});
test('corrections replace photo marks but ordinary additions retain previous explanations',()=>{
 assert.ok(exports.editsExistingDrawing('Corrige la flecha del ventrículo izquierdo'));
 assert.ok(exports.replacesPhotoMarks('Corrige la flecha del ventrículo izquierdo'));
 assert.ok(!exports.replacesPhotoMarks('Añade otra flecha a la aorta'));
});
