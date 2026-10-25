import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

/** Width the floating "Salir" pill takes, so other top-right buttons can sit beside it. */
export const SIGN_OUT_SPACE = 84;

/** Thin notice only when there is something to say (demo mode or a failed save); a connected account shows nothing. */
export function AccountStatus() {
  const { accountMode, syncStatus, syncError, retrySync } = useFamily();
  const insets = useSafeAreaInsets();
  const demo = accountMode === 'demo';
  if (!demo && !(accountMode === 'cloud' && syncStatus === 'error')) return null;
  return <View style={{ paddingTop: insets.top + 6, paddingBottom: 6, paddingLeft: 12, paddingRight: SIGN_OUT_SPACE + 12, backgroundColor: colors.mist, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 12 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 13 }} accessibilityLiveRegion="polite">
      {demo ? 'Modo demo · los cambios se guardan solo en este equipo' : syncError}
    </Text>
    {demo ? <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={{ paddingVertical: 4 }}><Text style={{ color: colors.coral, fontSize: 13 }}>Crear mi cuenta real</Text></Pressable>
      : <Pressable accessibilityRole="button" onPress={() => void retrySync()} style={{ paddingVertical: 4 }}><Text style={{ color: colors.coral, fontSize: 13 }}>Reintentar guardado</Text></Pressable>}
  </View>;
}

/** Small floating "Salir" pill in the top-right corner, drawn above every screen. */
export function SignOutButton() {
  const { accountMode, logout } = useFamily();
  const insets = useSafeAreaInsets();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const closeSession = async () => {
    if (closing) return;
    setClosing(true); setError('');
    try { await logout(); router.replace('/(auth)/welcome'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión.'); }
    finally { setClosing(false); }
  };
  if (accountMode === 'signed-out') return null;
  return <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 12, right: 12, zIndex: 40, alignItems: 'flex-end', gap: 6 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" accessibilityHint="Salir de tu cuenta y volver a la bienvenida" disabled={closing} onPress={() => void closeSession()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white, borderRadius: 999 }}>
      <Text style={{ color: colors.coral, fontSize: 14, lineHeight: 16 }}>⏻</Text>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodySemi, fontSize: 13 }}>{closing ? 'Saliendo' : 'Salir'}</Text>
    </Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.coral, backgroundColor: colors.white, padding: 6, borderRadius: 8, fontSize: 12 }}>{error}</Text> : null}
  </View>;
}
