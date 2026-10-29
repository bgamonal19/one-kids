// Server-only Supabase Auth helpers shared by /api/account and /api/tutor. Never bundled by the app.
export class AccountError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function config(env) {
  const url = (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const publishable = (env.SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const secret = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, publishable, secret };
}

export function bearerToken(request) {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
  return match ? match[1] : '';
}

// Asks Supabase Auth who owns the access token; the client never supplies its own user ID.
export async function verifyUser(token, env, fetcher = fetch) {
  const { url, publishable } = config(env);
  if (!url || !publishable) throw new AccountError('Las cuentas no están configuradas en el servidor.', 503);
  if (!token) throw new AccountError('Inicia sesión con tu cuenta familiar para continuar.', 401);
  let response;
  try {
    response = await fetcher(`${url}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
  } catch { throw new AccountError('No se pudo comprobar tu sesión. Inténtalo de nuevo.', 502); }
  if (response.status === 401 || response.status === 403) throw new AccountError('Tu sesión caducó. Vuelve a entrar.', 401);
  if (!response.ok) throw new AccountError('No se pudo comprobar tu sesión. Inténtalo de nuevo.', 502);
  const user = await response.json().catch(() => ({}));
  if (typeof user.id !== 'string' || !user.id) throw new AccountError('Tu sesión caducó. Vuelve a entrar.', 401);
  if (user.app_metadata?.one_kids_role === 'child') {
    const membership = await fetcher(`${url}/rest/v1/child_accounts?auth_user_id=eq.${encodeURIComponent(user.id)}&select=parent_user_id,child_id`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (!membership.ok) throw new AccountError('No se pudo comprobar el acceso infantil.', 502);
    const rows = await membership.json();
    if (!rows[0]?.parent_user_id) throw new AccountError('Este acceso infantil ya no está disponible. Consulta con tus padres.', 403);
    return { id: user.id, role: 'child', parentId: rows[0].parent_user_id, childId: rows[0].child_id };
  }
  return { id: user.id };
}

// Deleting the Auth user cascades to public.family_states.
export async function deleteAccount(token, env, fetcher = fetch) {
  const { url, secret } = config(env);
  if (!secret) throw new AccountError('La eliminación de cuentas todavía no está activada. Escríbenos y la borramos manualmente.', 503);
  const user = await verifyUser(token, env, fetcher);
  if (user.role === 'child') throw new AccountError('Solo los padres pueden eliminar la cuenta familiar.', 403);
  let response;
  try {
    response = await fetcher(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) });
  } catch { throw new AccountError('No se pudo eliminar la cuenta. Inténtalo de nuevo.', 502); }
  if (!response.ok && response.status !== 404) throw new AccountError('No se pudo eliminar la cuenta. Inténtalo de nuevo.', 502);
  return { deleted: true };
}
