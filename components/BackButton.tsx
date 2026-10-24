import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export function BackButton() {
  const { state } = useFamily();
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(state.child ? '/(child)' : '/(auth)/welcome');
  };
  return <Pressable accessibilityRole="button" accessibilityLabel="Volver a la pantalla anterior" onPress={back} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 20, marginBottom: 8 }}><Text style={{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.skyDeep }}>← Volver</Text></Pressable>;
}
