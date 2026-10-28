import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/board-wipe.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
test('only the real contact area is erased; untouched rows remain visible', () => {
  const { wipedBand, eraserPoint, wipeRows } = exports;
  for (const width of [300, 1200]) for (const height of [180, 480, 1800]) {
    const rows = wipeRows(height);
    for (let step = 1; step < 100; step++) {
      const progress = step / 100, row = Math.min(rows - 1, Math.floor(progress * rows));
      const point = eraserPoint(progress, width, height);
      const band = wipedBand(progress, row, width, height);
      assert.equal(band.top, point.y);
      assert.equal(band.height, 44);
      assert.equal(row % 2 ? band.left : band.left + band.width, row % 2 ? point.x : point.x + 96);
      for (let future = row + 1; future < rows; future++) assert.equal(wipedBand(progress, future, width, height).width, 0);
      for (let past = 0; past < row; past++) assert.equal(wipedBand(progress, past, width, height).width, width);
    }
  }
});
test('contact rows overlap and cover the entire board without leaving gaps', () => {
  for (const height of [20, 44, 180, 468, 480, 1800]) {
    let bottom = 0;
    for (let row = 0; row < exports.wipeRows(height); row++) {
      const band = exports.wipedBand(1, row, 600, height);
      assert.equal(band.width, 600); assert.ok(band.top <= bottom);
      bottom = band.top + band.height;
      assert.equal(exports.wipedBand(0, row, 600, height).width, 0);
    }
    assert.equal(bottom, height);
  }
});
test('eraser and duration adapt to screen and board size within practical limits', () => {
  for (let i = 0; i <= 100; i++) {
    const point = exports.eraserPoint(i / 100, 600, 480);
    assert.ok(point.x >= 0 && point.x + 96 <= 600);
    assert.ok(point.y >= 0 && point.y + 44 <= 480);
  }
  assert.ok(exports.eraseDuration(1200, 480) > exports.eraseDuration(300, 480));
  assert.ok(exports.eraseDuration(1200, 10000) <= 12000);
});
