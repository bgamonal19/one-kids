import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { worldsForBand, type WorldId } from '@/lib/worlds';

const WORLD_ICON: Record<WorldId, string> = { numbers: '🔢', letters: '🔤', explorer: '🔭' };

export default function WorldsIndex() {
  const { state, worldsUnlocked } = useFamily();
  const band = state.child ? getAgeBand(state.child.age) : '7-9';
  const worlds = worldsForBand(band);

  if (!worldsUnlocked) {
    return (
      <Screen>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={[styles.title, styles.center]}>¡Primero las tareas!</Text>
        <Text style={[styles.hint, styles.center]}>
          Termina tus tareas y los Mundos se abren solos. 🔑
        </Text>
        <PrimaryButton label="📝 Ir a mis tareas" onPress={() => router.push('/(child)/tasks')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>🌍 Mundos</Text>
      <Text style={styles.hint}>Elige un mundo y gana ⭐</Text>
      <View style={styles.list}>
        {worlds.map((w) => (
          <Pressable
            key={w.id}
            accessibilityRole="button"
            accessibilityLabel={`${w.title}: ${w.subtitle}`}
            onPress={() => router.push(`/(child)/worlds/${w.id}`)}
            style={({ pressed }) => [styles.world, { backgroundColor: w.color }, pressed && styles.pressed]}
          >
            <View style={styles.worldIcon}><Text style={styles.worldEmoji}>{WORLD_ICON[w.id]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.worldTitle}>{w.title}</Text>
              <Text style={styles.worldSub}>{w.subtitle}</Text>
            </View>
            <View style={styles.play}><Text style={[styles.playIcon, { color: w.color }]}>▶</Text></View>
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
    fontFamily: fonts.bodySemi,
    color: colors.inkMuted,
    fontSize: 17,
  },
  center: { textAlign: 'center' },
  lockIcon: { fontSize: 72, textAlign: 'center', marginTop: spacing.lg },
  list: { gap: 14 },
  world: {
    borderRadius: radii.lg,
    padding: 18,
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  worldIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  worldEmoji: { fontSize: 40 },
  worldTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.white },
  worldSub: { marginTop: 4, fontFamily: fonts.bodySemi, color: colors.white, fontSize: 16, opacity: 0.95 },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 22, marginLeft: 3 },
});
