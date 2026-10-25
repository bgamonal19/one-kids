import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { slotLabel } from '@/lib/school-calendar';
import type { CourseLink } from '@/lib/types';

const LINK_OPTIONS: { id: CourseLink; label: string }[] = [
  { id: 'numbers', label: 'Mundo Números' },
  { id: 'letters', label: 'Mundo Letras' },
  { id: 'explorer', label: 'Mundo Explorador' },
  { id: 'tutor', label: 'Tutor IA' },
  { id: 'custom', label: 'Solo lista' },
];

const LINK_ICON: Record<CourseLink, string> = { numbers: '🔢', letters: '🔤', explorer: '🔭', tutor: '✏️', custom: '📘' };

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
    const id = await addCourse({ title, desc, link });
    setTitle('');
    setDesc('');
    setLink('custom');
    setShowForm(false);
    // Straight to the profile so the teacher, reference and days can be filled in.
    router.push({ pathname: '/(child)/course/[id]', params: { id } });
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>📚 Cursos</Text>
      <Text style={styles.sub}>Toca un curso para empezar. En «Perfil» pones profesor, número de referencia y horario.</Text>
      <PrimaryButton label="🗓️ Ver rol semanal" variant="secondary" onPress={() => router.push('/(child)/schedule')} style={{ marginBottom: spacing.sm }} />

      <PrimaryButton
        label={showForm ? 'Cerrar' : '＋ Agregar curso'}
        variant={showForm ? 'secondary' : 'primary'}
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
          <Text style={styles.label}>Al tocarlo abre</Text>
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
                accessibilityRole="button"
                accessibilityLabel={href ? `Abrir ${c.title}` : c.title}
                disabled={!href}
                onPress={() => {
                  if (href) router.push(href);
                }}
                style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
              >
                <View style={styles.cardIcon}><Text style={styles.cardEmoji}>{LINK_ICON[c.link]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  {c.desc ? <Text style={styles.cardDesc}>{c.desc}</Text> : null}
                  {c.teacher || c.reference ? <Text style={styles.cardMeta}>{[c.teacher && `👩‍🏫 ${c.teacher}`, c.reference && `N.º ${c.reference}`].filter(Boolean).join(' · ')}</Text> : null}
                  {c.schedule?.length ? <Text style={styles.cardMeta}>🗓️ {c.schedule.map(slotLabel).join(' · ')}</Text> : null}
                  {href ? (
                    <View style={styles.play}><Text style={styles.playText}>▶ Jugar</Text></View>
                  ) : (
                    <Text style={styles.cardDesc}>Guardado en tu lista</Text>
                  )}
                </View>
              </Pressable>
              <View style={{ gap: 8 }}>
              <Pressable onPress={() => router.push({ pathname: '/(child)/course/[id]', params: { id: c.id } })} accessibilityRole="button" accessibilityLabel={`Perfil del curso ${c.title}`} hitSlop={6} style={styles.profileBtn}>
                <Text style={styles.profileText}>Perfil</Text>
              </Pressable>
              <Pressable onPress={() => removeCourse(c.id)} accessibilityRole="button" accessibilityLabel={`Quitar el curso ${c.title}`} hitSlop={6} style={styles.remove}>
                <Text style={styles.removeText}>🗑️</Text>
              </Pressable>
              </View>
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
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.sky },
  chipText: { fontFamily: fonts.bodySemi, color: colors.ink },
  chipTextOn: { color: colors.white },
  list: { gap: 14 },
  card: {
    minHeight: 120,
    borderRadius: radii.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  cardIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 40 },
  play: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 },
  playText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 20 },
  cardMeta: { marginTop: 4, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.white },
  profileBtn: { minWidth: 48, height: 48, paddingHorizontal: 12, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  profileText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
});
