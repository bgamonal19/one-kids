import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ParentHome() {
  const { state, allTasksDone } = useFamily();
  const child = state.child;

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Panel de padres</Text>
      <Text style={styles.hint}>Hola {state.parent?.name}. Aquí controlas tareas y enfoque.</Text>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Niño</Text>
        <Text style={styles.statValue}>
          {child ? `${child.name} · ${child.age} años · ${child.stars} ★` : 'Sin perfil'}
        </Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Modo enfoque</Text>
        <Text style={[styles.statValue, { color: state.focusActive ? colors.coral : colors.leafDeep }]}>
          {state.focusActive ? 'Activo — mundos bloqueados' : 'Inactivo'}
        </Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>Tareas</Text>
        <Text style={styles.statValue}>
          {state.tasks.filter((t) => t.done).length}/{state.tasks.length} hechas
          {allTasksDone && state.tasks.length > 0 ? ' · ¡Listo!' : ''}
        </Text>
      </View>

      <PrimaryButton
        label="Ir a modo niño"
        onPress={() => router.replace('/(child)')}
        style={{ marginTop: spacing.lg }}
      />
      <PrimaryButton
        label="Gestionar tareas"
        variant="secondary"
        onPress={() => router.push('/(parent)/tasks')}
      />
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
  stat: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 10,
  },
  statLabel: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 13 },
  statValue: { marginTop: 4, fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 17 },
});
