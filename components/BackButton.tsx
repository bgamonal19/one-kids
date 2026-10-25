import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export function BackButton() {
  const { state } = useFamily();
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(state.child ? '/(child)' : '/(auth)/welcome');
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver a la pantalla anterior"
      hitSlop={8}
      onPress={back}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.arrow}>←</Text>
      <Text style={styles.label}>Volver</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    paddingLeft: 8,
    paddingRight: 20,
    borderRadius: 999,
    backgroundColor: colors.white,
    marginBottom: 12,
    shadowColor: '#1A2B3C',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.skyDeep,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 38,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    overflow: 'hidden',
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
});
