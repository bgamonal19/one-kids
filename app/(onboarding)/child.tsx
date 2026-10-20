import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AGE_OPTIONS, getAgeProfile } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildProfileScreen() {
  const { setChild } = useFamily();
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [error, setError] = useState('');
  const profile = useMemo(() => getAgeProfile(age), [age]);

  const submit = async () => {
    if (!name.trim()) {
      setError('Escribe el nombre del niño o niña.');
      return;
    }
    await setChild(name, age);
    router.replace('/(child)');
  };

  return (
    <Screen scroll>
      <Text style={styles.kicker}>Perfil</Text>
      <Text style={styles.title}>¿Quién va a aprender?</Text>
      <Text style={styles.hint}>
        Elige la edad (4 a 16). Adaptamos botones, Kiko, tutor y juegos.
      </Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Luna"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Edad</Text>
      <View style={styles.ages}>
        {AGE_OPTIONS.map((n) => (
          <Pressable
            key={n}
            onPress={() => setAge(n)}
            style={[styles.ageChip, age === n && { backgroundColor: profile.accent }]}
          >
            <Text style={[styles.ageText, age === n && styles.ageTextOn]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.preview, { borderColor: profile.accent }]}>
        <Text style={styles.previewTitle}>{profile.bandTitle}</Text>
        <Text style={styles.previewBody}>{profile.label}</Text>
        <Text style={styles.previewBody}>Ejemplo de menú: {profile.tileLabels.mundos}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Empezar en ONE KIDS" onPress={submit} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginTop: spacing.md,
    fontFamily: fonts.bodySemi,
    color: colors.skyDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.ink,
  },
  hint: {
    marginTop: 10,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  label: { fontFamily: fonts.bodySemi, color: colors.ink, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  ages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageChip: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  ageTextOn: { color: colors.white },
  preview: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 3,
  },
  previewTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  previewBody: { marginTop: 4, fontFamily: fonts.body, color: colors.inkMuted },
  error: { marginTop: 12, fontFamily: fonts.bodySemi, color: colors.coral },
});
