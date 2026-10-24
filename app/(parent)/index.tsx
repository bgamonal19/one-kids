import { GradePicker } from '@/components/GradePicker';
import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AGE_OPTIONS, getAgeProfile } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ParentHome() {
  const { state, allTasksDone, updateChildAge, accountMode, refreshFamily, logout, addChild, switchChild } = useFamily();
  const [accountError, setAccountError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(8);
  const [newCountry, setNewCountry] = useState('Otro');
  const [newGrade, setNewGrade] = useState('');
  const [adding, setAdding] = useState(false);
  const changeProfile = async (id: string) => {
    if (busy) return;
    setBusy(true); setAccountError('');
    try { await switchChild(id); }
    catch (e) { setAccountError(e instanceof Error ? e.message : 'No se pudo cambiar de perfil.'); }
    finally { setBusy(false); }
  };
  const createChild = async () => {
    if (busy) return;
    if (!newName.trim()) { setAccountError('Escribe el nombre de tu hijo o hija.'); return; }
    setBusy(true); setAccountError('');
    try { await addChild(newName, newAge, { country: newCountry, grade: newGrade }); setNewName(''); setAdding(false); }
    catch (e) { setAccountError(e instanceof Error ? e.message : 'No se pudo crear el perfil.'); }
    finally { setBusy(false); }
  };
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

      <View style={styles.stat}>
        <Text style={styles.statValue}>Mis hijos</Text>
        <Text style={styles.statSub}>Cada perfil tiene sus tareas, agenda, cursos, compañero y estrellas.</Text>
        {(state.profiles ?? []).map(profile => (
          <Pressable key={profile.child.id} accessibilityRole="button" accessibilityState={{ selected: profile.child.id === child?.id, disabled: busy }} disabled={busy} onPress={() => void changeProfile(profile.child.id)} style={[styles.profileCard, profile.child.id === child?.id && styles.selectedProfile]}>
            <Text style={styles.statValue}>{profile.child.id === child?.id ? '✓ ' : ''}{profile.child.name}</Text>
            <Text style={styles.statSub}>{profile.child.age} años · {profile.child.stars} ★ · {profile.child.id === child?.id ? 'Perfil activo' : 'Elegir perfil'}</Text>
          </Pressable>
        ))}
        <PrimaryButton label={adding ? "Cancelar" : "+ Agregar hijo o hija"} variant="secondary" onPress={() => setAdding(!adding)} disabled={busy} />
        {adding ? <View style={{ gap: 12, marginTop: 14 }}>
          <TextInput accessibilityLabel="Nombre del nuevo hijo o hija" placeholder="Nombre de tu hijo o hija" value={newName} onChangeText={setNewName} maxLength={60} style={styles.nameInput} />
          <Text style={styles.statLabel}>Edad</Text>
          <View style={styles.ages}>{AGE_OPTIONS.map(age => <Pressable key={age} accessibilityRole="button" accessibilityLabel={`${age} años`} accessibilityState={{ selected: age === newAge }} onPress={() => setNewAge(age)} style={[styles.ageChip, age === newAge && { backgroundColor: colors.skyDeep }]}><Text style={[styles.ageText, age === newAge && styles.ageOn]}>{age}</Text></Pressable>)}</View>
          <GradePicker country={newCountry} grade={newGrade} onCountryChange={setNewCountry} onGradeChange={setNewGrade} />
          <PrimaryButton label={busy ? "Guardando…" : "Crear perfil infantil"} onPress={createChild} disabled={busy} />
        </View> : null}
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
  profileCard: { padding: 16, marginTop: 12, borderRadius: radii.md, borderWidth: 2, borderColor: colors.mist, backgroundColor: colors.paper },
  selectedProfile: { borderColor: colors.skyDeep },
  nameInput: { backgroundColor: colors.paper, padding: 14, borderRadius: radii.md, fontFamily: fonts.body, color: colors.ink, fontSize: 16 },
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
