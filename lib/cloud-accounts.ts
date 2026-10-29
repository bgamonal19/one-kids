import { preserveProfiles, selectChildProfile } from './child-profiles';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { APP_URL } from './app-url';
import { validateRegistration, isNumericPassword } from './account-validation';
import type { ChildLearningState, FamilyState } from './types';
import { DEFAULT_COURSES } from './types';

export type RegistrationResult = 'signed-in' | 'confirm-email';
export const ACCOUNT_SETUP_MESSAGE = 'Las cuentas todavía no están activadas. Puedes probar la demo mientras terminamos de conectar el servicio.';
export function requireAccounts(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error(ACCOUNT_SETUP_MESSAGE);
  return client;
}
function accountError(code?: string): Error {
  if (code === 'email_not_confirmed') return new Error('Confirma primero tu correo con el enlace que recibiste y vuelve a entrar.');
  if (code === 'user_already_exists') return new Error('Ya existe una cuenta con ese correo. Usa «Entrar».');
  if (code?.includes('rate_limit')) return new Error('Has hecho varios intentos. Espera un momento antes de probar otra vez.');
  if (code === 'email_address_not_authorized') return new Error('El envío de confirmaciones aún está limitado a los administradores del proyecto. Falta activar el correo de ONE KIDS.');
  if (code === 'weak_password') return new Error('La clave no cumple la configuración del servicio. Usa entre 6 y 12 números.');
  return new Error('No pudimos conectar con las cuentas. Revisa tu conexión y vuelve a intentarlo.');
}
export async function signUpAccount(client: SupabaseClient | null, input: { name: string; email: string; password: string }) {
  const error = validateRegistration(input);
  if (error) throw new Error(error);
  const { data, error: authError } = await requireAccounts(client).auth.signUp({
    email: input.email.trim().toLowerCase(), password: input.password,
    options: { data: { full_name: input.name.trim().slice(0, 80) }, emailRedirectTo: `${APP_URL}/login` },
  });
  if (authError) throw accountError(authError.code);
  if (!data.user) throw new Error('No se pudo iniciar el registro. Inténtalo de nuevo.');
  return { result: data.session ? 'signed-in' as const : 'confirm-email' as const, user: data.session?.user ?? null };
}
export async function signInAccount(client: SupabaseClient | null, email: string, password: string): Promise<User | null> {
  if (!isNumericPassword(password)) throw new Error('La clave debe tener entre 6 y 12 números.');
  const { data, error } = await requireAccounts(client).auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error?.code === 'invalid_credentials') return null;
  if (error) throw accountError(error.code);
  if (!data.session?.user) throw new Error('No se pudo iniciar la sesión. Vuelve a intentarlo.');
  return data.session.user;
}

// Same answer whether or not the email has an account, so nobody can probe for families.
export async function requestPasswordReset(client: SupabaseClient | null, email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Escribe un correo válido.');
  const { error } = await requireAccounts(client).auth.resetPasswordForEmail(clean, { redirectTo: `${APP_URL}/reset-password` });
  if (error && (error.code?.includes('rate_limit') || error.code === 'email_address_not_authorized')) throw accountError(error.code);
}
export async function updateAccountPassword(client: SupabaseClient | null, password: string, confirmPassword: string): Promise<void> {
  if (!isNumericPassword(password)) throw new Error('La clave debe tener entre 6 y 12 números, sin letras ni espacios.');
  if (password !== confirmPassword) throw new Error('Las claves no coinciden. Revisa los dos campos.');
  const { error } = await requireAccounts(client).auth.updateUser({ password });
  if (error?.code === 'same_password') throw new Error('Esa ya es tu clave actual. Elige una distinta.');
  if (error?.code === 'session_not_found' || error?.code === 'session_expired') throw new Error('El enlace caducó. Pide uno nuevo desde «¿Olvidaste tu clave?».');
  if (error) throw accountError(error.code);
}
export function accountEndpoint(web: boolean): string {
  return web ? '/api/account' : `${APP_URL}/api/account`;
}
export async function deleteCloudAccount(token: string | null, endpoint: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (!token) throw new Error('Vuelve a entrar en tu cuenta antes de eliminarla.');
  let response;
  try { response = await fetcher(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) }); }
  catch { throw new Error('No se pudo conectar. Tu cuenta sigue activa; inténtalo de nuevo.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
  }
}

export function familyForUser(user: User, raw: Partial<FamilyState> & { pinHash?: string } = {}): FamilyState {
  return preserveProfiles({
    profiles: Array.isArray(raw.profiles) ? raw.profiles : [],
    parent: { id: user.id, email: user.email || '', name: String(user.user_metadata?.full_name || 'Familia').slice(0, 80), pinHash: raw.pinHash || '' },
    child: raw.child ?? null,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [], courses: Array.isArray(raw.courses) ? raw.courses : DEFAULT_COURSES,
    agenda: Array.isArray(raw.agenda) ? raw.agenda : [], focusActive: raw.focusActive === true, onboarded: raw.onboarded === true,
  });
}
// Explicit allowlist: no password, access token, email or client-supplied owner ID in JSON.
export function familyPayload(state: FamilyState) {
  return { profiles: preserveProfiles(state).profiles, child: state.child, tasks: state.tasks, courses: state.courses, agenda: state.agenda, focusActive: state.focusActive, onboarded: state.onboarded, pinHash: state.parent?.pinHash || '' };
}
type ChildAccountRow = { auth_user_id: string; parent_user_id: string; child_id: string; username: string; learning: ChildLearningState; version: number };
// Per authenticated session: only changed profiles are written, using optimistic versions.
const snapshots = new Map<string, ChildAccountRow[]>();
export function cloudVersions(userId: string): Record<string, number> {
  return Object.fromEntries((snapshots.get(userId) || []).map(row => [row.auth_user_id, row.version]));
}
export function restorePendingVersions(userId: string, versions: Record<string, number> = {}): void {
  // An offline recovery must compare against the version it originally edited, not the freshly loaded one.
  for (const row of snapshots.get(userId) || []) row.version = versions[row.auth_user_id] ?? 0;
}
function withUsername(row: ChildAccountRow): ChildLearningState {
  return { ...row.learning, child: { ...row.learning.child, loginUsername: row.username } };
}
export function childLoginEmail(username: string): string {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(clean)) throw new Error('Escribe el usuario que te dieron tus padres.');
  return `${clean}@students.one-kids.invalid`;
}
export async function configureChildAccess(token: string | null, endpoint: string, input: { childId: string; username: string; password: string }): Promise<void> {
  if (!token) throw new Error('Vuelve a entrar como padre o madre.');
  childLoginEmail(input.username);
  if (!isNumericPassword(input.password)) throw new Error('La clave debe tener de 6 a 12 números.');
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(30000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No se pudo guardar el acceso infantil.');
}
export async function loadCloudFamily(client: SupabaseClient, user: User): Promise<FamilyState> {
  const childSession = user.app_metadata?.one_kids_role === 'child';
  const { data: rows, error: accessError } = await client.from('child_accounts').select('*').eq(childSession ? 'auth_user_id' : 'parent_user_id', user.id);
  if (accessError) throw new Error('No se pudieron cargar los accesos de tu familia. Reintenta.');
  const accounts = (rows || []) as ChildAccountRow[];
  snapshots.set(user.id, accounts);
  if (childSession) {
    if (accounts.length !== 1) throw new Error('Tu acceso infantil no está disponible. Consulta con tus padres.');
    const row = accounts[0], learning = withUsername(row);
    return { ...familyForUser(user), ...learning, profiles: [learning], parent: { id: user.id, email: '', name: learning.child.name, pinHash: '' }, childAccess: { childId: row.child_id, username: row.username }, onboarded: true };
  }
  const { data, error } = await client.from('family_states').select('state').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('No se pudieron cargar los datos de tu familia. Reintenta.');
  let state = familyForUser(user, data?.state || {});
  const profiles = state.profiles || [];
  state = { ...state, profiles: [...profiles.filter(p => !accounts.some(a => a.child_id === p.child.id)), ...accounts.map(withUsername)] };
  const active = state.child?.id || state.profiles?.[0]?.child.id;
  if (active) {
    // Do not let preserveProfiles replace the authoritative cloud profile with the old family snapshot.
    const target = state.profiles?.find(p => p.child.id === active);
    if (target) state = selectChildProfile({ ...state, ...target }, active);
  }
  return state;
}
export async function saveCloudFamily(client: SupabaseClient, userId: string, state: FamilyState): Promise<void> {
  if (state.parent?.id !== userId) throw new Error('La cuenta cambió. Vuelve a iniciar sesión antes de guardar.');
  const accounts = snapshots.get(userId);
  if (!accounts) throw new Error('Actualiza tu cuenta antes de guardar.');
  const profiles = preserveProfiles(state).profiles || [];
  for (const row of accounts) {
    const next = profiles.find(p => p.child.id === row.child_id);
    if (!next || JSON.stringify(next) === JSON.stringify(withUsername(row))) continue;
    const learning = { ...next, child: { ...next.child } };
    delete learning.child.loginUsername;
    const { data, error } = await client.from('child_accounts').update({ learning }).eq('auth_user_id', row.auth_user_id).eq('version', row.version).select('version');
    if (error) throw new Error('No se guardaron los cambios del perfil. Revisa la conexión.');
    if (!data?.length) throw new Error('Este perfil cambió en otro dispositivo. Actualiza la cuenta antes de continuar.');
    row.learning = learning; row.version = data[0].version;
  }
  if (state.childAccess) return; // RLS also denies a child's access to family_states.
  const { error } = await client.from('family_states').upsert({ user_id: userId, state: familyPayload(state) }, { onConflict: 'user_id' });
  if (error) throw new Error('No se guardaron los cambios en tu cuenta. Revisa la conexión y pulsa «Reintentar guardado».');
}
