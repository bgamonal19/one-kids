import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildHome() {
  const { state, worldsUnlocked, allTasksDone } = useFamily();
  const child = state.child;
  const band = child ? getAgeBand(child.age) : '8-10';

  return (
    <Screen scroll>
      <Animated.View entering={FadeInDown.duration(450)}>
        <BrandMark size="hero" subtitle={child ? `Hola ${child.name}, ¿listo para aprender?` : undefined} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).duration(450)} style={styles.meta}>
        <Text style={styles.metaText}>Edad {child?.age} · banda {band}</Text>
        <Text style={styles.stars}>{child?.stars ?? 0} ★</Text>
      </Animated.View>

      {state.focusActive ? (
        <View style={styles.focusBanner}>
          <Text style={styles.focusTitle}>Modo enfoque</Text>
          <Text style={styles.focusBody}>
            {allTasksDone
              ? '¡Tareas listas! Ya puedes jugar.'
              : 'Termina tus tareas para desbloquear los mundos.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Ayuda del tutor IA" onPress={() => router.push('/(child)/tutor')} />
        <PrimaryButton
          label={worldsUnlocked ? 'Entrar a los mundos' : 'Mundos bloqueados'}
          variant="secondary"
          onPress={() => router.push('/(child)/worlds')}
        />
        <PrimaryButton
          label="Mis tareas"
          variant="ghost"
          onPress={() => router.push('/(child)/tasks')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
  stars: { fontFamily: fonts.display, fontSize: 20, color: colors.sun },
  focusBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    padding: 16,
  },
  focusTitle: { fontFamily: fonts.bodyBold, color: colors.white, fontSize: 16 },
  focusBody: { marginTop: 4, fontFamily: fonts.body, color: colors.white },
  actions: { marginTop: spacing.xl, gap: 12 },
});
