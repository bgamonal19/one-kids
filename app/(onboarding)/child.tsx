import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AGE_OPTIONS } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildProfileScreen() {
  const { setChild } = useFamily();
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [error, setError] = useState('');

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
      <Text style={styles.hint}>Adaptamos el tutor y los mundos a su edad.</Text>

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
            style={[styles.ageChip, age === n && styles.ageOn]}
          >
            <Text style={[styles.ageText, age === n && styles.ageTextOn]}>{n}</Text>
          </Pressable>
        ))}
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
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageOn: { backgroundColor: colors.sky },
  ageText: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  ageTextOn: { color: colors.white },
  error: { marginTop: 12, fontFamily: fonts.bodySemi, color: colors.coral },
});
