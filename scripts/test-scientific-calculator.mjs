import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/scientific-calculator.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { calculate: c } = exports;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
test('precedence, parentheses, signs, exponents, percentages and implicit multiplication', () => {
  assert.equal(c('2+3×4'), 14); assert.equal(c('(2+3)×4'), 20);
  assert.equal(c('-2^2'), -4); assert.equal(c('(-2)^2'), 4); assert.equal(c('2^-3'), .125); assert.equal(c('2^3^2'), 512);
  close(c('2π'), 2 * Math.PI); assert.equal(c('200×10%'), 20); assert.equal(c('2(3+4)'), 14); assert.equal(c('1e-3+2'), 2.001);
});
test('trigonometric, inverse and hyperbolic functions in DEG and RAD', () => {
  close(c('sin(30)'), .5); close(c('cos(60)'), .5); close(c('tan(45)'), 1);
  close(c('asin(.5)'), 30); close(c('acos(.5)'), 60); close(c('atan(1)'), 45);
  close(c('sin(pi/2)', 'RAD'), 1); close(c('asin(1)', 'RAD'), Math.PI / 2);
  close(c('asinh(sinh(2))'), 2); close(c('acosh(cosh(2))'), 2); close(c('atanh(tanh(1))'), 1);
});
test('roots, logarithms, exponentials, rounding, factorial and combinatorics', () => {
  assert.equal(c('sqrt(81)+cbrt(27)'), 12); assert.equal(c('root(-8,3)'), -2);
  close(c('ln(e)'), 1); close(c('log(1000)'), 3); close(c('logb(8,2)'), 3); close(c('exp(2)'), Math.exp(2));
  assert.equal(c('abs(-2)+floor(2.8)+ceil(2.1)+round(2.6)'), 10);
  assert.equal(c('5!'), 120); assert.equal(c('0!'), 1); assert.equal(c('nCr(5,2)'), 10); assert.equal(c('nPr(5,2)'), 20);
  assert.equal(c('Ans×2', 'DEG', 7), 14);
});
test('invalid operations fail clearly rather than displaying infinity or executing code', () => {
  for (const expression of ['1/0', 'sqrt(-1)', 'log(0)', 'asin(2)', 'tan(90)', '(-1)!', '1.5!', '171!', 'nCr(3,4)', 'root(2,0)', 'logb(3,1)', '2+', 'sin(30', '2,,3', 'globalThis.process.exit()', 'constructor(1)', '('.repeat(60)+'1'+')'.repeat(60)]) assert.throws(() => c(expression), undefined, expression);
});
