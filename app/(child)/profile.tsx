import { GradePicker } from '@/components/GradePicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CompanionPicker } from '@/components/CompanionPicker';
import { type CompanionId } from '@/lib/companions';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

const INTERESTS = ['Ciencia', 'Arte', 'Deportes', 'Tecnología', 'Música', 'Naturaleza', 'Idiomas', 'Robótica', 'Historia', 'Videojuegos', 'Lectura', 'Matemáticas'];

export default function LearningProfileScreen() {
  const { state, updateLearningProfile } = useFamily();
  const child = state.child;
  const [grade, setGrade] = useState(child?.grade ?? '');
  const [country, setCountry] = useState(child?.country ?? 'Italia');
  const [interests, setInterests] = useState<string[]>(child?.interests ?? []);
  const [companion, setCompanion] = useState<CompanionId>(child?.companion ?? 'bear');
  const [saving, setSaving] = useState(false);
  const toggleInterest = (interest: string) => setInterests(previous =>
    previous.includes(interest) ? previous.filter(value => value !== interest) : previous.length < 8 ? [...previous, interest] : previous
  );
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateLearningProfile({ grade, country, interests, companion });
      if (router.canGoBack()) router.back();
      else router.replace('/(child)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.eyebrow}>MI PERFIL EDUCATIVO</Text>
      <Text style={styles.title}>Aprendo a mi manera ✨</Text>
      <Text style={styles.hint}>Personaliza las materias y el acompañante. La edad ya configura la apariencia general de ONE KIDS.</Text>

      <CompanionPicker value={companion} onChange={setCompanion} age={child?.age ?? 8} />
      <PrimaryButton label={saving ? 'Guardando…' : 'Guardar mi compañero'} onPress={save} disabled={saving} style={{ marginTop: spacing.lg }} />

      <GradePicker country={country} grade={grade} onCountryChange={setCountry} onGradeChange={setGrade} />
      <Text style={styles.info}>El grado se guarda en tu perfil. La adaptación curricular automática se incorporará en una fase posterior.</Text>

      <Text style={styles.heading}>¿Qué temas te gustan?</Text>
      <Text style={styles.hint}>Elige hasta ocho.</Text>
      <View style={styles.chips}>
        {INTERESTS.map(value => {
          const active = interests.includes(value);
          return (
            <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggleInterest(value)} style={[styles.chip, active && styles.active]}>
              <Text style={[styles.chipText, active && styles.activeText]}>{active ? '✓ ' : ''}{value}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label={saving ? 'Guardando…' : 'Guardar mi perfil'} onPress={save} style={{ marginTop: spacing.xl, marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bodyBold, color: colors.skyDeep, fontSize: 12, marginTop: 16, letterSpacing: 1 },
  title: { fontFamily: fonts.displayBold, color: colors.ink, fontSize: 28, marginTop: 8 },
  hint: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14, marginTop: 8 },
  heading: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.ink, marginTop: 25, marginBottom: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#D8E7F2', borderRadius: radii.pill, paddingHorizontal: 15, paddingVertical: 11 },
  active: { backgroundColor: '#347DE1', borderColor: '#347DE1' },
  chipText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 14 },
  activeText: { color: colors.white },
  input: { borderRadius: radii.md, backgroundColor: colors.white, padding: 15, fontFamily: fonts.body, color: colors.ink, fontSize: 16 },
  info: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, marginTop: 10, lineHeight: 18 },
});
