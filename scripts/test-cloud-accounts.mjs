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
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, process, AbortSignal, require: path => load(path.replace('./', '')) });
  return cache[name] = exports;
}
const { signUpAccount, signInAccount, familyForUser, familyPayload, saveCloudFamily, requestPasswordReset, updateAccountPassword, deleteCloudAccount } = load('cloud-accounts');
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
test('password reset never reveals whether an email has an account', async () => {
  let sent;
  const client = error => ({ auth: { resetPasswordForEmail: async (email, options) => { sent = { email, options }; return { data: {}, error }; } } });
  await requestPasswordReset(client(null), ' TEST@example.com ');
  assert.equal(sent.email, 'test@example.com'); assert.match(sent.options.redirectTo, /\/reset-password$/);
  await requestPasswordReset(client({ code: 'user_not_found' }), 'nobody@example.com');
  await assert.rejects(requestPasswordReset(client({ code: 'over_email_send_rate_limit' }), 'a@b.co'), /Espera/);
  await assert.rejects(requestPasswordReset(client(null), 'no-email'), /correo válido/);
});
test('new passwords keep the numeric rules and confirmation', async () => {
  let saved;
  const client = error => ({ auth: { updateUser: async value => { saved = value; return { data: {}, error }; } } });
  await updateAccountPassword(client(null), '000123', '000123'); assert.equal(saved.password, '000123');
  await assert.rejects(updateAccountPassword(client(null), '000123', '000124'), /no coinciden/);
  await assert.rejects(updateAccountPassword(client(null), 'abc123', 'abc123'), /números/);
  await assert.rejects(updateAccountPassword(client({ code: 'same_password' }), '000123', '000123'), /actual/);
});
test('account deletion sends the session token and reports server errors', async () => {
  let headers;
  await deleteCloudAccount('token', '/api/account', async (_, options) => { headers = options.headers; return Response.json({ deleted: true }); });
  assert.equal(headers.Authorization, 'Bearer token');
  await assert.rejects(deleteCloudAccount(null, '/api/account', async () => { throw Error('must not call'); }), /Vuelve a entrar/);
  await assert.rejects(deleteCloudAccount('token', '/api/account', async () => Response.json({ error: 'no activada' }, { status: 503 })), /no activada/);
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
const { preserveProfiles, addChildProfile, selectChildProfile } = load('child-profiles');
test('legacy single-child families migrate without losing progress', () => {
  const state = preserveProfiles({ ...familyForUser(user), child: { id: 'a', name: 'Ana', age: 8, stars: 7 }, tasks: [{ id: 'task-a', title: 'Leer', done: true }] });
  assert.equal(state.profiles.length, 1);
  assert.equal(state.profiles[0].child.stars, 7);
  assert.equal(state.profiles[0].tasks[0].id, 'task-a');
});
test('siblings keep tasks, agenda, courses, focus and stars isolated across switches and cloud roundtrips', () => {
  const a = preserveProfiles({ ...familyForUser(user), child: { id: 'a', name: 'Ana', age: 8, stars: 7 }, tasks: [{ id: 'a-task' }], courses: [], agenda: [{ id: 'a-event' }], focusActive: true });
  const b = addChildProfile(a, { id: 'b', name: 'Leo', age: 5, stars: 0 });
  assert.equal(b.tasks.length, 0); assert.equal(b.agenda.length, 0); assert.equal(b.focusActive, false);
  const edited = preserveProfiles({ ...b, tasks: [{ id: 'b-task' }], child: { ...b.child, stars: 2 } });
  const restored = familyForUser(user, familyPayload(edited));
  const switched = selectChildProfile(restored, 'a');
  assert.equal(switched.child.stars, 7); assert.equal(switched.tasks[0].id, 'a-task');
  assert.equal(switched.courses.length, 0); assert.equal(switched.agenda[0].id, 'a-event'); assert.equal(switched.focusActive, true);
  const back = selectChildProfile(switched, 'b');
  assert.equal(back.child.stars, 2); assert.equal(back.tasks[0].id, 'b-task'); assert.equal(back.profiles.length, 2);
});
