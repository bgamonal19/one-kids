import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

export function AccountStatus() {
  const { accountMode, syncStatus, syncError, retrySync, logout } = useFamily();
  if (accountMode === 'signed-out') return null;
  return <View style={{ padding: 10, backgroundColor: colors.mist, gap: 6 }}>
    <Text style={{ fontFamily: fonts.bodySemi, color: colors.ink, textAlign: 'center' }} accessibilityLiveRegion="polite">
      {accountMode === 'demo' ? 'Modo demo · los cambios se guardan solo en este equipo' : syncStatus === 'error' ? syncError : syncStatus === 'saving' ? 'Guardando en tu cuenta…' : 'Cuenta conectada'}
    </Text>
    {accountMode === 'demo' ? <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')}><Text style={{ textAlign: 'center', color: colors.coral }}>Crear mi cuenta real</Text></Pressable> : syncStatus === 'error' ? <Pressable accessibilityRole="button" onPress={() => void retrySync()}><Text style={{ textAlign: 'center', color: colors.coral }}>Reintentar guardado</Text></Pressable> : null}
    {accountMode === 'cloud' && syncStatus === 'error' ? <Pressable accessibilityRole="button" onPress={() => void logout().catch(() => {})}><Text style={{ textAlign: 'center', color: colors.ink }}>Cerrar sesión</Text></Pressable> : null}
  </View>;
}
