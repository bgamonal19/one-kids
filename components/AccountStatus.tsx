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
  return <View style={{ padding: 10, backgroundColor: colors.mist, gap: 6 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, textAlign: 'center' }} accessibilityLiveRegion="polite">
      {accountMode === 'demo' ? 'Modo demo · los cambios se guardan solo en este equipo' : syncStatus === 'error' ? syncError : syncStatus === 'saving' ? 'Guardando en tu cuenta…' : 'Cuenta conectada'}
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
      {accountMode === 'demo' ? <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={{ padding: 8 }}><Text style={{ color: colors.coral }}>Crear mi cuenta real</Text></Pressable> : syncStatus === 'error' ? <Pressable accessibilityRole="button" onPress={() => void retrySync()} style={{ padding: 8 }}><Text style={{ color: colors.coral }}>Reintentar guardado</Text></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={closing} onPress={() => void closeSession()} style={{ padding: 8 }}><Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>{closing ? 'Cerrando…' : 'Cerrar sesión'}</Text></Pressable>
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.coral, textAlign: 'center' }}>{error}</Text> : null}
  </View>;
}
