import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { worldsForBand } from '@/lib/worlds';

export default function WorldsIndex() {
  const { state, worldsUnlocked } = useFamily();
  const band = state.child ? getAgeBand(state.child.age) : '7-9';
  const worlds = worldsForBand(band);

  if (!worldsUnlocked) {
    return (
      <Screen>
        <Text style={styles.title}>Mundos bloqueados</Text>
        <Text style={styles.hint}>
          El modo enfoque está activo. Completa tus tareas o pide a un padre que desbloquee con el
          PIN.
        </Text>
        <PrimaryButton label="Ir a mis tareas" onPress={() => router.push('/(child)/tasks')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Mundos</Text>
      <Text style={styles.hint}>Aprende jugando. Gana estrellas en cada ronda.</Text>
      <View style={styles.list}>
        {worlds.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => router.push(`/(child)/worlds/${w.id}`)}
            style={[styles.world, { backgroundColor: w.color }]}
          >
            <Text style={styles.worldTitle}>{w.title}</Text>
            <Text style={styles.worldSub}>{w.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  list: { gap: 12 },
  world: {
    borderRadius: radii.lg,
    padding: 22,
    minHeight: 110,
    justifyContent: 'center',
  },
  worldTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.white },
  worldSub: { marginTop: 6, fontFamily: fonts.body, color: colors.white, opacity: 0.92 },
});
