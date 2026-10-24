import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/account-validation.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: result.exports });
const { isNumericPassword, validateRegistration } = result.exports;
const account = { name: 'Familia de prueba', email: 'pruebas@example.com', password: '001234', confirmPassword: '001234' };
test('numeric passwords retain leading zeros and allow six to twelve digits', () => {
  assert.equal(isNumericPassword('001234'), true);
  assert.equal(isNumericPassword('012345678901'), true);
});
test('letters, spaces, symbols and wrong lengths are rejected', () => {
  for (const password of ['', '12345', '1234567890123', '123a56', '123 56', ' 123456', '+123456', '１２３４５６']) assert.equal(isNumericPassword(password), false);
});
test('account registration requires a name, valid email and matching passwords', () => {
  assert.equal(validateRegistration(account), null);
  assert.match(validateRegistration({ ...account, name: ' ' }), /nombre/);
  assert.match(validateRegistration({ ...account, email: 'invalido' }), /correo/);
  assert.match(validateRegistration({ ...account, confirmPassword: '654321' }), /coinciden/);
  assert.match(validateRegistration({ ...account, password: 'abcdef' }), /números/);
});
