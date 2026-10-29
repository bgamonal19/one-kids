import { AccountError, verifyUser } from './account-core.mjs';

// Credentials go only to Auth; the learning record never contains a password.
export async function provisionChild(token, input, env, fetcher = fetch) {
  const user = await verifyUser(token, env, fetcher);
  if (user.role === 'child') throw new AccountError('Solo los padres pueden administrar accesos.', 403);
  const username = String(input?.username || '').trim().toLowerCase();
  const password = String(input?.password || '');
  const childId = String(input?.childId || '');
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) throw new AccountError('El usuario debe tener de 3 a 40 letras minúsculas, números, puntos o guiones.');
  if (!/^\d{6,12}$/.test(password)) throw new AccountError('La clave debe tener de 6 a 12 números.');
  const url = (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const secret = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim(); 
  if (!secret) throw new AccountError('Falta activar los accesos infantiles en el servidor.', 503);
  const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
  const call = async (path, options = {}) => fetcher(`${url}${path}`, { ...options, headers, signal: AbortSignal.timeout(15000) });
  const familyResponse = await call(`/rest/v1/family_states?user_id=eq.${encodeURIComponent(user.id)}&select=state`);
  if (!familyResponse.ok) throw new AccountError('No se pudo comprobar el perfil.', 502);
  const families = await familyResponse.json();
  const state = families[0]?.state;
  const profiles = state?.profiles || [];
  const learning = profiles.find(p => p.child?.id === childId) || (state?.child?.id === childId ? { child: state.child, tasks: state.tasks, courses: state.courses, agenda: state.agenda, focusActive: state.focusActive } : null);
  if (!learning) throw new AccountError('Guarda primero el perfil en tu cuenta y vuelve a intentarlo.', 403);
  const existingResponse = await call(`/rest/v1/child_accounts?parent_user_id=eq.${encodeURIComponent(user.id)}&child_id=eq.${encodeURIComponent(childId)}&select=auth_user_id,username`);
  if (!existingResponse.ok) throw new AccountError('No se pudieron comprobar los accesos.', 502);
  const existing = (await existingResponse.json())[0];
  if (existing) {
    if (username !== existing.username) throw new AccountError('El usuario de este perfil ya está creado. Puedes cambiar su clave.');
    const reset = await call(`/auth/v1/admin/users/${encodeURIComponent(existing.auth_user_id)}`, { method: 'PUT', body: JSON.stringify({ password }) });
    if (!reset.ok) throw new AccountError('No se pudo cambiar la clave.', 502);
    return { username, childId };
  }
  const createdResponse = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: `${username}@students.one-kids.invalid`, password, email_confirm: true, app_metadata: { one_kids_role: 'child' } }) });
  if (!createdResponse.ok) {
    if ([422, 409].includes(createdResponse.status)) throw new AccountError('Ese usuario ya está ocupado. Elige otro.', 409);
    throw new AccountError('No se pudo crear el acceso infantil.', 502);
  }
  const created = await createdResponse.json();
  if (!created.id) throw new AccountError('No se pudo crear el acceso infantil.', 502);
  const saved = await call('/rest/v1/child_accounts', { method: 'POST', body: JSON.stringify({ parent_user_id: user.id, auth_user_id: created.id, child_id: childId, username, learning }) });
  if (!saved.ok) {
    // Roll back only the new Auth user, never an existing family's account.
    await call(`/auth/v1/admin/users/${encodeURIComponent(created.id)}`, { method: 'DELETE' });
    throw new AccountError('No se pudo guardar el acceso. Reintenta con otro usuario.', saved.status === 409 ? 409 : 502);
  }
  return { username, childId };
}
