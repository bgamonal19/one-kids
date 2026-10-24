import type { SupabaseClient, User } from '@supabase/supabase-js';
import { validateRegistration, isNumericPassword } from './account-validation';
import type { FamilyState } from './types';
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
    options: { data: { full_name: input.name.trim().slice(0, 80) }, emailRedirectTo: `${process.env.EXPO_PUBLIC_APP_URL || 'https://one-kids.vercel.app'}/login` },
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

export function familyForUser(user: User, raw: Partial<FamilyState> & { pinHash?: string } = {}): FamilyState {
  return {
    parent: { id: user.id, email: user.email || '', name: String(user.user_metadata?.full_name || 'Familia').slice(0, 80), pinHash: raw.pinHash || '' },
    child: raw.child ?? null,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [], courses: Array.isArray(raw.courses) ? raw.courses : DEFAULT_COURSES,
    agenda: Array.isArray(raw.agenda) ? raw.agenda : [], focusActive: raw.focusActive === true, onboarded: raw.onboarded === true,
  };
}
// Explicit allowlist: no password, access token, email or client-supplied owner ID in JSON.
export function familyPayload(state: FamilyState) {
  return { child: state.child, tasks: state.tasks, courses: state.courses, agenda: state.agenda, focusActive: state.focusActive, onboarded: state.onboarded, pinHash: state.parent?.pinHash || '' };
}
export async function loadCloudFamily(client: SupabaseClient, user: User): Promise<FamilyState> {
  const { data, error } = await client.from('family_states').select('state').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('No se pudieron cargar los datos de tu familia. Reintenta; si acabas de activar el servicio, falta configurar su base de datos.');
  return familyForUser(user, data?.state || {});
}
export async function saveCloudFamily(client: SupabaseClient, userId: string, state: FamilyState): Promise<void> {
  if (state.parent?.id !== userId) throw new Error('La cuenta cambió. Vuelve a iniciar sesión antes de guardar.');
  const { error } = await client.from('family_states').upsert({ user_id: userId, state: familyPayload(state) }, { onConflict: 'user_id' });
  if (error) throw new Error('No se guardaron los cambios en tu cuenta. Revisa la conexión y pulsa «Reintentar guardado».');
}
