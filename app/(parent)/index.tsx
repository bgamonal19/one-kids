import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AGE_OPTIONS, getAgeProfile } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ParentHome() {
  const { state, allTasksDone, updateChildAge, accountMode, refreshFamily, logout } = useFamily();
  const [accountError, setAccountError] = useState('');
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true); setAccountError('');
    try { await logout(); router.replace('/(auth)/welcome'); }
    catch (e) { setAccountError(e instanceof Error ? e.message : 'No se pudo cerrar sesión.'); }
    finally { setBusy(false); }
  };
  const child = state.child;
  const profile = child ? getAgeProfile(child.age) : null;

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Panel de padres</Text>
      <Text style={styles.hint}>Hola {state.parent?.name}. Controlas edad, tareas y enfoque.</Text>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>{accountMode === 'demo' ? 'Cuenta de demostración' : 'Tu cuenta'}</Text>
        <Text style={styles.statValue}>{state.parent?.email}</Text>
        {accountMode === 'cloud' ? <PrimaryButton label="Actualizar desde mi cuenta" variant="secondary" onPress={() => void refreshFamily()} /> : null}
        <PrimaryButton label={busy ? "Cerrando…" : "Cerrar sesión"} variant="ghost" onPress={signOut} disabled={busy} />
        {accountError ? <Text style={styles.hint}>{accountError}</Text> : null}
      </View>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Niño</Text>
        <Text style={styles.statValue}>
          {child ? `${child.name} · ${child.age} años · ${child.stars} ★` : 'Sin perfil'}
        </Text>
        {profile ? <Text style={styles.statSub}>{profile.bandTitle} · {profile.label}</Text> : null}
      </View>

      {child ? (
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cambiar edad (4–16)</Text>
          <Text style={styles.statSub}>La app adapta menú, Kiko, tutor y juegos al instante.</Text>
          <View style={styles.ages}>
            {AGE_OPTIONS.map((n) => (
              <Pressable
                key={n}
                onPress={() => updateChildAge(n)}
                style={[styles.ageChip, child.age === n && { backgroundColor: profile?.accent ?? colors.sky }]}
              >
                <Text style={[styles.ageText, child.age === n && styles.ageOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
  statSub: { marginTop: 4, fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14 },
  ages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  ageChip: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  ageOn: { color: colors.white },
});
