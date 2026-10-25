import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('TU_PROYECTO'));

export const supabase: SupabaseClient | null = isSupabaseConfigured && (Platform.OS !== 'web' || typeof window !== 'undefined')
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
      },
    })
  : null;

export function getTutorEndpoint(): string | null {
  if (!isSupabaseConfigured) return null;
  return `${url.replace(/\/$/, '')}/functions/v1/tutor-help`;
}

// Signed-in family's token for our own server functions; null in demo or signed out.
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
