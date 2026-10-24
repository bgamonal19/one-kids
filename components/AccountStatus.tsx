import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

export function AccountStatus() {
  const { accountMode, syncStatus, syncError, retrySync, logout } = useFamily();
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
  return <View style={{ padding: 10, paddingHorizontal: 76, minHeight: 76, backgroundColor: colors.mist, gap: 6 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, textAlign: 'center' }} accessibilityLiveRegion="polite">
      {accountMode === 'demo' ? 'Modo demo · los cambios se guardan solo en este equipo' : syncStatus === 'error' ? syncError : syncStatus === 'saving' ? 'Guardando en tu cuenta…' : 'Cuenta conectada'}
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
      {accountMode === 'demo' ? <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={{ padding: 8 }}><Text style={{ color: colors.coral }}>Crear mi cuenta real</Text></Pressable> : syncStatus === 'error' ? <Pressable accessibilityRole="button" onPress={() => void retrySync()} style={{ padding: 8 }}><Text style={{ color: colors.coral }}>Reintentar guardado</Text></Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar sesión" accessibilityHint="Salir de tu cuenta y volver a la bienvenida" disabled={closing} onPress={() => void closeSession()} style={{ position: 'absolute', right: 14, top: 6, minWidth: 52, minHeight: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderRadius: 16 }}>
      <Text style={{ color: colors.coral, fontSize: 28, lineHeight: 32 }}>{closing ? '…' : '⏻'}</Text>
      <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 11 }}>{closing ? 'Saliendo' : 'Salir'}</Text>
    </Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.coral, textAlign: 'center' }}>{error}</Text> : null}
  </View>;
}
