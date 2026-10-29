import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccount, verifyUser, AccountError } from '../server/account-core.mjs';
import { DELETE } from '../api/account.mjs';
import { POST as tutorPOST, GET as tutorGET } from '../api/tutor.mjs';

const env = { EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co/', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x', SUPABASE_SECRET_KEY: ' sb_secret_y\n' };
// Fake Supabase Auth: one valid token belongs to family-a.
function auth(calls = []) {
  return async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', headers: options.headers });
    if (url.endsWith('/auth/v1/user')) return options.headers.Authorization === 'Bearer good' ? Response.json({ id: 'family-a' }) : Response.json({ msg: 'bad jwt' }, { status: 401 });
    if (url.includes('/auth/v1/admin/users/')) return options.headers.apikey === 'sb_secret_y' ? new Response(null, { status: 200 }) : new Response(null, { status: 401 });
    throw Error(`unexpected ${url}`);
  };
}

test('the user comes from Supabase Auth, never from the client', async () => {
  assert.deepEqual(await verifyUser('good', env, auth()), { id: 'family-a' });
  await assert.rejects(verifyUser('forged', env, auth()), e => e instanceof AccountError && e.status === 401);
  await assert.rejects(verifyUser('', env, auth()), e => e.status === 401);
  await assert.rejects(verifyUser('good', {}, auth()), e => e.status === 503);
});
test('account deletion removes only the token owner with the trimmed secret key', async () => {
  const calls = [];
  assert.deepEqual(await deleteAccount('good', env, auth(calls)), { deleted: true });
  const admin = calls.find(c => c.method === 'DELETE');
  assert.equal(admin.url, 'https://demo.supabase.co/auth/v1/admin/users/family-a');
  await assert.rejects(deleteAccount('forged', env, auth()), e => e.status === 401);
  const none = [];
  await assert.rejects(deleteAccount('good', { ...env, SUPABASE_SECRET_KEY: '' }, auth(none)), e => e.status === 503);
  assert.equal(none.length, 0);
});
test('HTTP account deletion rejects other origins and missing sessions', async () => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    const foreign = await DELETE(new Request('https://one-kids.vercel.app/api/account', { method: 'DELETE', headers: { origin: 'https://evil.example', authorization: 'Bearer good' } }));
    assert.equal(foreign.status, 403);
    const anonymous = await DELETE(new Request('https://one-kids.vercel.app/api/account', { method: 'DELETE' }));
    assert.equal(anonymous.status, 401);
  } finally { process.env = saved; }
});
test('TUTOR_REQUIRE_ACCOUNT blocks anonymous AI requests before reading the body', async () => {
  const saved = { ...process.env }; const savedFetch = globalThis.fetch;
  Object.assign(process.env, env, { TUTOR_REQUIRE_ACCOUNT: 'true', OPENAI_API_KEY: '' , ANTHROPIC_API_KEY: '' });
  globalThis.fetch = auth();
  try {
    assert.equal((await (await tutorGET(new Request('https://one-kids.vercel.app/api/tutor'))).json()).accountRequired, true);
    const body = JSON.stringify({ ageBand: '7-9', message: '8 + 3' });
    const anonymous = await tutorPOST(new Request('https://one-kids.vercel.app/api/tutor', { method: 'POST', body, headers: { 'content-type': 'application/json' } }));
    assert.equal(anonymous.status, 401);
    const signedIn = await tutorPOST(new Request('https://one-kids.vercel.app/api/tutor', { method: 'POST', body, headers: { 'content-type': 'application/json', authorization: 'Bearer good' } }));
    assert.equal(signedIn.status, 503); // authenticated, but no AI keys in this test
  } finally { process.env = saved; globalThis.fetch = savedFetch; }
});

test('child token requires authoritative membership and cannot delete the family', async () => {
  const childAuth = async url => url.endsWith('/auth/v1/user')
    ? Response.json({ id: 'kid', app_metadata: { one_kids_role: 'child' } })
    : Response.json([{ parent_user_id: 'family-a', child_id: 'a' }]);
  assert.deepEqual(await verifyUser('kid-token', env, childAuth), { id: 'kid', role: 'child', parentId: 'family-a', childId: 'a' });
  await assert.rejects(deleteAccount('kid-token', env, childAuth), e => e.status === 403);
  await assert.rejects(verifyUser('kid-token', env, async url => url.endsWith('/auth/v1/user') ? childAuth(url) : Response.json([])), e => e.status === 403);
  // User-editable metadata must never grant a different account role.
  assert.deepEqual(await verifyUser('good', env, async () => Response.json({ id: 'family-a', user_metadata: { one_kids_role: 'child', parentId: 'other' } })), { id: 'family-a' });
});
