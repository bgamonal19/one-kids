import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/board-wipe.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
test('eraser clears completed rows and only the current part of the next row', () => {
  const { wipedBand, ERASE_ROWS } = exports;
  for (let row = 0; row < ERASE_ROWS; row++) {
    assert.equal(wipedBand(0, row, 600, 480).width, 0);
    assert.equal(wipedBand(1, row, 600, 480).width, 600);
    assert.equal(wipedBand(.5, row, 600, 480).width, row < 3 ? 600 : 0);
  }
  assert.equal(wipedBand(.25, 1, 600, 480).left, 300);
});
test('eraser traverses the board in alternating directions and stays within its bounds', () => {
  const { eraserPoint } = exports;
  for (const width of [300, 1200]) for (let i = 0; i <= 100; i++) {
    const point = eraserPoint(i / 100, width, 480, 96, 44);
    assert.ok(point.x >= 0 && point.x <= width - 96);
    assert.ok(point.y >= 0 && point.y + 44 <= 480);
  }
  assert.ok(eraserPoint(.05, 600, 480, 96, 44).x < eraserPoint(.1, 600, 480, 96, 44).x);
  assert.ok(eraserPoint(.2, 600, 480, 96, 44).x > eraserPoint(.3, 600, 480, 96, 44).x);
});
