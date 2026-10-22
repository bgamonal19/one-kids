// Asset checks exercise all 90 frame selections against the real PNG dimensions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/expressions.ts'), 'utf8');
const moduleResult = { exports: {} };
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(js, { exports: moduleResult.exports, require: name => path.resolve(root, 'lib', name) });
const { EXPRESSIONS, APPROVED_CHARACTERS, expressionFrame, hasExpressions } = moduleResult.exports;
assert.equal(EXPRESSIONS.length, 15);
assert.equal(new Set(EXPRESSIONS.map(item => item.id)).size, 15);
assert.equal(APPROVED_CHARACTERS.length, 12);
let verified = 0;
for (const character of APPROVED_CHARACTERS) {
  assert.ok(hasExpressions(character));
  const positions = new Set();
  for (const expression of EXPRESSIONS) {
    const frame = expressionFrame(character, expression.id);
    const png = fs.readFileSync(frame.asset);
    assert.equal(png.readUInt32BE(16), frame.sheetWidth);
    assert.equal(png.readUInt32BE(20), frame.sheetHeight);
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0);
    assert.ok(frame.x + frame.width <= frame.sheetWidth);
    assert.ok(frame.y + frame.height <= frame.sheetHeight);
    positions.add(`${frame.x},${frame.y}`);
    verified++;
  }
  assert.equal(positions.size, 15, `${character} must have 15 distinct frames`);
}
assert.equal(hasExpressions('kiko'), true);
assert.equal(hasExpressions('unknown'), false);
console.log(`PASS: ${verified} expression frames, 12 valid source sheets, unknown ID rejected.`);
