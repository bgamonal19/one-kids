import test from 'node:test';
import assert from 'node:assert/strict';
import { provisionChild } from '../server/child-access.mjs';
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public', SUPABASE_SECRET_KEY: 'secret' };
const input = { childId: 'kid-a', username: 'leo.2026', password: '001234' };
const learning = { child: { id: 'kid-a', name: 'Leo' }, tasks: [], courses: [], agenda: [], focusActive: false };
function backend({ child = false, missing = false, existing = false, failedInsert = false, duplicate = false } = {}) {
  const calls = [];
  return { calls, fetch: async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: child ? 'child-auth' : 'parent-a', app_metadata: child ? { one_kids_role: 'child' } : {} });
    if (url.includes('auth_user_id=eq.child-auth')) return Response.json([{ parent_user_id: 'parent-a', child_id: 'kid-a' }]);
    if (url.includes('/family_states?')) return Response.json([{ state: { profiles: missing ? [] : [learning] } }]);
    if (url.includes('/child_accounts?')) return Response.json(existing ? [{ auth_user_id: 'existing', username: input.username }] : []);
    if (url.endsWith('/auth/v1/admin/users')) return duplicate ? Response.json({}, { status: 422 }) : Response.json({ id: 'new-auth' });
    if (url.endsWith('/child_accounts')) return new Response(null, { status: failedInsert ? 409 : 201 });
    if (url.includes('/auth/v1/admin/users/')) return new Response(null, { status: 200 });
    throw Error('unexpected request');
  } };
}
test('parent creates a confirmed child login without email delivery or plaintext database passwords', async () => {
  const b = backend();
  assert.deepEqual(await provisionChild('parent', input, env, b.fetch), { username: input.username, childId: input.childId });
  const auth = JSON.parse(b.calls.find(c => c.url.endsWith('/auth/v1/admin/users')).body);
  assert.equal(auth.password, '001234'); assert.equal(auth.email_confirm, true); assert.equal(auth.app_metadata.one_kids_role, 'child');
  const stored = JSON.parse(b.calls.find(c => c.url.endsWith('/child_accounts')).body);
  assert.equal(stored.parent_user_id, 'parent-a'); assert.equal(stored.child_id, 'kid-a');
  assert.equal(JSON.stringify(stored).includes('001234'), false);
});
test('children cannot provision users; parent cannot provision somebody else’s profile', async () => {
  for (const config of [{ child: true }, { missing: true }]) {
    const b = backend(config);
    await assert.rejects(provisionChild('token', input, env, b.fetch), e => e.status === 403);
    assert.equal(b.calls.some(c => c.url.includes('/admin/')), false);
  }
});
test('duplicate usernames and failed membership creation do not leave new auth accounts', async () => {
  const duplicate = backend({ duplicate: true });
  await assert.rejects(provisionChild('parent', input, env, duplicate.fetch), e => e.status === 409);
  assert.equal(duplicate.calls.some(c => c.method === 'DELETE'), false);
  const b = backend({ failedInsert: true });
  await assert.rejects(provisionChild('parent', input, env, b.fetch), e => e.status === 409);
  assert.equal(b.calls.find(c => c.method === 'DELETE').url.endsWith('/new-auth'), true);
});
test('reset changes only the existing child password and never replaces progress', async () => {
  const b = backend({ existing: true });
  await provisionChild('parent', input, env, b.fetch);
  const update = b.calls.find(c => c.method === 'PUT');
  assert.equal(update.url.endsWith('/existing'), true); assert.deepEqual(JSON.parse(update.body), { password: '001234' });
  assert.equal(b.calls.some(c => c.method === 'POST'), false);
  await assert.rejects(provisionChild('parent', { ...input, username: 'other' }, env, b.fetch), /ya está creado/);
});
test('numeric password and username are validated before Auth admin mutations', async () => {
  for (const patch of [{ password: 'abc123' }, { username: 'x@y.com' }, { password: '12345' }]) {
    const b = backend();
    await assert.rejects(provisionChild('parent', { ...input, ...patch }, env, b.fetch));
    assert.equal(b.calls.some(c => c.url.includes('/admin/')), false);
  }
});
