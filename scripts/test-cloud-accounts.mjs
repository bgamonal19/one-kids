import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const cache = {};
function load(name) {
  if (cache[name]) return cache[name];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, process, require: path => load(path.replace('./', '')) });
  return cache[name] = exports;
}
const { signUpAccount, signInAccount, familyForUser, familyPayload, saveCloudFamily } = load('cloud-accounts');
const user = { id: 'family-a', email: 'test@example.com', user_metadata: { full_name: 'Ana' } };
const input = { name: ' Ana ', email: ' TEST@example.com ', password: '001234' };
test('no fake local signup or login without configured backend', async () => {
  await assert.rejects(signUpAccount(null, input), /activadas/);
  await assert.rejects(signInAccount(null, input.email, input.password), /activadas/);
});
test('confirmation does not fabricate a signed-in user; passwords preserve zeros', async () => {
  let received;
  const client = { auth: { signUp: async value => { received = value; return { data: { user, session: null }, error: null }; } } };
  const result = await signUpAccount(client, input);
  assert.equal(result.result, 'confirm-email'); assert.equal(result.user, null);
  assert.equal(received.password, '001234'); assert.equal(received.email, 'test@example.com');
});
test('login handles credentials and email confirmation errors', async () => {
  const client = code => ({ auth: { signInWithPassword: async () => ({ data: {}, error: { code } }) } });
  assert.equal(await signInAccount(client('invalid_credentials'), input.email, input.password), null);
  await assert.rejects(signInAccount(client('email_not_confirmed'), input.email, input.password), /Confirma/);
  await assert.rejects(signInAccount(client('invalid_credentials'), input.email, 'abc123'), /números/);
});
test('family owner comes from authenticated user and payload excludes credentials', () => {
  const state = familyForUser(user, { parent: { id: 'attacker', password: 'secret' }, pinHash: 'hash', courses: [] });
  assert.equal(state.parent.id, user.id); assert.equal(state.parent.password, undefined); assert.equal(state.courses.length, 0);
  const payload = familyPayload({ ...state, password: '001234', access_token: 'secret' });
  assert.equal(payload.parent, undefined); assert.equal(payload.password, undefined); assert.equal(payload.access_token, undefined);
});
test('saving refuses an account switch before touching the database', async () => {
  await assert.rejects(saveCloudFamily(null, 'family-b', familyForUser(user)), /cuenta cambió/);
});
