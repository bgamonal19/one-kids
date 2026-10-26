// Monthly AI usage per family account, kept in Supabase (public.tutor_accounts) and only touched with the secret key.
// If the table or key is missing, the tutor keeps working without metering and the open mode stays off.
export const LIMIT_OPTIONS = [100_000, 300_000, 1_000_000, 3_000_000];
export const DEFAULT_LIMIT = 300_000;

function config(env) {
  const url = (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const secret = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return url && secret ? { url, secret } : null;
}
const headers = secret => ({ apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' });
export const currentMonth = (date = new Date()) => date.toISOString().slice(0, 7);

/** { openMode, limit, used, month } or null when metering is not set up. */
export async function getUsage(userId, env, fetcher = fetch) {
  const cfg = config(env);
  if (!cfg) return null;
  try {
    const response = await fetcher(`${cfg.url}/rest/v1/tutor_accounts?user_id=eq.${encodeURIComponent(userId)}&select=open_mode,monthly_limit,usage_month,used_tokens`, { headers: headers(cfg.secret), signal: AbortSignal.timeout(8_000) });
    if (!response.ok) { console.error(`[tutor] usage read ${response.status}`); return null; }
    const [row] = await response.json();
    const month = currentMonth();
    return {
      openMode: row?.open_mode === true,
      limit: LIMIT_OPTIONS.includes(row?.monthly_limit) ? row.monthly_limit : DEFAULT_LIMIT,
      used: row?.usage_month === month ? Math.max(0, Number(row.used_tokens) || 0) : 0,
      month,
    };
  } catch { console.error('[tutor] usage read failed'); return null; }
}

/** Adds tokens atomically in the database (the function resets the count when the month changes). */
export async function addUsage(userId, tokens, env, fetcher = fetch) {
  const cfg = config(env);
  if (!cfg || !(tokens > 0)) return null;
  try {
    const response = await fetcher(`${cfg.url}/rest/v1/rpc/tutor_add_usage`, { method: 'POST', headers: headers(cfg.secret), body: JSON.stringify({ p_user: userId, p_month: currentMonth(), p_tokens: Math.round(tokens) }), signal: AbortSignal.timeout(8_000) });
    if (!response.ok) { console.error(`[tutor] usage write ${response.status}`); return null; }
    const used = await response.json();
    return typeof used === 'number' ? used : null;
  } catch { console.error('[tutor] usage write failed'); return null; }
}

export function validateSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const settings = {};
  if (typeof raw.openMode === 'boolean') settings.open_mode = raw.openMode;
  if (raw.monthlyLimit !== undefined) {
    if (!LIMIT_OPTIONS.includes(raw.monthlyLimit)) return null;
    settings.monthly_limit = raw.monthlyLimit;
  }
  return Object.keys(settings).length ? settings : null;
}

export async function saveSettings(userId, settings, env, fetcher = fetch) {
  const cfg = config(env);
  if (!cfg) return false;
  try {
    const response = await fetcher(`${cfg.url}/rest/v1/tutor_accounts?on_conflict=user_id`, { method: 'POST', headers: { ...headers(cfg.secret), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, ...settings }), signal: AbortSignal.timeout(8_000) });
    if (!response.ok) console.error(`[tutor] settings write ${response.status}`);
    return response.ok;
  } catch { return false; }
}
