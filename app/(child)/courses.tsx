import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import type { CourseLink } from '@/lib/types';

const LINK_OPTIONS: { id: CourseLink; label: string }[] = [
  { id: 'numbers', label: 'Mundo Números' },
  { id: 'letters', label: 'Mundo Letras' },
  { id: 'explorer', label: 'Mundo Explorador' },
  { id: 'tutor', label: 'Tutor IA' },
  { id: 'custom', label: 'Solo lista' },
];

function hrefFor(link: CourseLink) {
  if (link === 'numbers') return '/(child)/worlds/numbers' as const;
  if (link === 'letters') return '/(child)/worlds/letters' as const;
  if (link === 'explorer') return '/(child)/worlds/explorer' as const;
  if (link === 'tutor') return '/(child)/tutor' as const;
  return null;
}

export default function CoursesScreen() {
  const { state, addCourse, removeCourse } = useFamily();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState<CourseLink>('custom');

  const submit = async () => {
    if (!title.trim()) return;
    await addCourse({ title, desc, link });
    setTitle('');
    setDesc('');
    setLink('custom');
    setShowForm(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Cursos</Text>
      <Text style={styles.sub}>Elige un curso o agrega uno nuevo a tu lista.</Text>

      <PrimaryButton
        label={showForm ? 'Cerrar formulario' : '+ Agregar curso'}
        onPress={() => setShowForm((v) => !v)}
        style={{ marginBottom: spacing.md }}
      />

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.label}>Nombre del curso</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Inglés básico"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            placeholder="Qué vas a aprender"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          <Text style={styles.label}>Al tocándolo abre</Text>
          <View style={styles.chips}>
            {LINK_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setLink(opt.id)}
                style={[styles.chip, link === opt.id && styles.chipOn]}
              >
                <Text style={[styles.chipText, link === opt.id && styles.chipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Guardar curso" onPress={submit} />
        </View>
      ) : null}

      <View style={styles.list}>
        {state.courses.map((c) => {
          const href = hrefFor(c.link);
          return (
            <View key={c.id} style={[styles.card, { backgroundColor: c.color }]}>
              <Pressable
                onPress={() => {
                  if (href) router.push(href);
                }}
                style={({ pressed }) => [pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
                {!href ? (
                  <Text style={styles.cardDesc}>Curso guardado en tu lista</Text>
                ) : null}
              </Pressable>
              <Pressable onPress={() => removeCourse(c.id)} style={styles.remove}>
                <Text style={styles.removeText}>Quitar</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  sub: {
    marginTop: 8,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 16,
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
    gap: 10,
    marginBottom: spacing.lg,
  },
  label: { fontFamily: fonts.bodySemi, color: colors.ink },
  input: {
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.mist,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipOn: { backgroundColor: colors.sky },
  chipText: { fontFamily: fonts.bodySemi, color: colors.ink },
  chipTextOn: { color: colors.white },
  list: { gap: 14 },
  card: {
    minHeight: 120,
    borderRadius: radii.lg,
    padding: 22,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.white,
  },
  cardDesc: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.white,
    opacity: 0.95,
  },
  remove: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  removeText: { fontFamily: fonts.bodyBold, color: colors.white },
});
