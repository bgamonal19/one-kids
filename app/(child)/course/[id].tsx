import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { normalizeTime, WEEKDAY_NAMES, WEEKDAY_SHORT } from '@/lib/school-calendar';
import { useFamily } from '@/lib/store';
import type { CourseSlot } from '@/lib/types';

type DraftSlot = { day: number; start: string; end: string };

export default function CourseProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateCourse } = useFamily();
  const course = state.courses.find((c) => c.id === id);
  const [title, setTitle] = useState(course?.title ?? '');
  const [teacher, setTeacher] = useState(course?.teacher ?? '');
  const [reference, setReference] = useState(course?.reference ?? '');
  const [desc, setDesc] = useState(course?.desc ?? '');
  const [slots, setSlots] = useState<DraftSlot[]>(course?.schedule ?? []);
  const [followsSchool, setFollowsSchool] = useState(course?.followsSchool !== false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  if (!course) {
    return (
      <Screen scroll>
        <Text style={styles.title}>Curso no encontrado</Text>
        <PrimaryButton label="Ver mis cursos" onPress={() => router.replace('/(child)/courses')} />
      </Screen>
    );
  }

  const editSlot = (index: number, patch: Partial<DraftSlot>) => {
    setSlots((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setError('');
  };

  const save = async () => {
    if (!title.trim()) return setError('Escribe el nombre del curso.');
    const schedule: CourseSlot[] = [];
    for (const [i, slot] of slots.entries()) {
      const start = normalizeTime(slot.start), end = normalizeTime(slot.end);
      if (!start || !end) return setError(`Revisa las horas del horario ${i + 1} (formato 16:30).`);
      if (start >= end) return setError(`En el horario ${i + 1} la hora de fin debe ser después del inicio.`);
      schedule.push({ day: slot.day, start, end });
    }
    schedule.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    await updateCourse(course.id, {
      title: title.trim().slice(0, 80),
      teacher: teacher.trim().slice(0, 80),
      reference: reference.trim().slice(0, 40),
      desc: desc.trim().slice(0, 160),
      schedule,
      followsSchool,
    });
    setSlots(schedule);
    setError('');
    setSaved(true);
  };

  return (
    <Screen scroll>
      <View style={[styles.header, { backgroundColor: course.color }]}>
        <Text style={styles.headerKicker}>Perfil del curso</Text>
        <Text style={styles.headerTitle}>{title.trim() || course.title}</Text>
        {reference.trim() ? <Text style={styles.headerSub}>N.º {reference.trim()}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nombre del curso</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ej. Inglés" placeholderTextColor={colors.inkMuted} style={styles.input} />
        <Text style={styles.label}>Profesor o profesora</Text>
        <TextInput value={teacher} onChangeText={setTeacher} placeholder="Ej. Miss Laura Pérez" placeholderTextColor={colors.inkMuted} style={styles.input} />
        <Text style={styles.label}>Número de referencia</Text>
        <TextInput value={reference} onChangeText={setReference} placeholder="Ej. ING-204" placeholderTextColor={colors.inkMuted} style={styles.input} autoCapitalize="characters" />
        <Text style={styles.label}>Descripción</Text>
        <TextInput value={desc} onChangeText={setDesc} placeholder="Qué vas a aprender" placeholderTextColor={colors.inkMuted} style={styles.input} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>🗓️ Días y horas del curso</Text>
        <Text style={styles.hint}>Con esto se arma tu rol semanal.</Text>
        {slots.length === 0 ? <Text style={styles.empty}>Todavía no tiene horario.</Text> : null}
        {slots.map((slot, index) => (
          <View key={index} style={styles.slot}>
            <View style={styles.days}>
              {WEEKDAY_SHORT.map((short, i) => (
                <Pressable
                  key={short}
                  accessibilityRole="button"
                  accessibilityLabel={WEEKDAY_NAMES[i]}
                  accessibilityState={{ selected: slot.day === i + 1 }}
                  onPress={() => editSlot(index, { day: i + 1 })}
                  style={[styles.dayChip, slot.day === i + 1 && { backgroundColor: course.color }]}
                >
                  <Text style={[styles.dayText, slot.day === i + 1 && styles.dayTextOn]}>{short}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.times}>
              <TextInput value={slot.start} onChangeText={(start) => editSlot(index, { start })} placeholder="16:00" placeholderTextColor={colors.inkMuted} accessibilityLabel="Hora de inicio" style={[styles.input, styles.time]} />
              <Text style={styles.dash}>a</Text>
              <TextInput value={slot.end} onChangeText={(end) => editSlot(index, { end })} placeholder="17:00" placeholderTextColor={colors.inkMuted} accessibilityLabel="Hora de fin" style={[styles.input, styles.time]} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar el horario del ${WEEKDAY_NAMES[slot.day - 1]}`} onPress={() => setSlots((list) => list.filter((_, i) => i !== index))} style={styles.remove}>
                <Text style={styles.removeText}>🗑️</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <PrimaryButton label="＋ Añadir día" variant="secondary" onPress={() => setSlots((list) => [...list, { day: list.length ? Math.min(7, list[list.length - 1].day + 1) : 1, start: list[list.length - 1]?.start ?? '', end: list[list.length - 1]?.end ?? '' }])} />
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: followsSchool }} onPress={() => setFollowsSchool((v) => !v)} style={styles.toggle}>
          <View style={[styles.box, followsSchool && { backgroundColor: colors.leafDeep, borderColor: colors.leafDeep }]}>{followsSchool ? <Text style={styles.check}>✓</Text> : null}</View>
          <Text style={styles.toggleText}>Se suspende en vacaciones del colegio (los feriados siempre cuentan)</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>✅ Guardado. Ya aparece en tu rol semanal.</Text> : null}
      <PrimaryButton label="Guardar perfil" onPress={save} />
      <PrimaryButton label="📖 Modo estudio" variant="secondary" onPress={() => router.push({ pathname: '/(child)/study/[id]', params: { id: course.id } })} />
      <PrimaryButton label="🗓️ Ver rol semanal" variant="ghost" onPress={() => router.push('/(child)/schedule')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, marginBottom: spacing.md },
  header: { borderRadius: radii.lg, padding: 20, marginBottom: spacing.md },
  headerKicker: { fontFamily: fonts.bodyBold, color: colors.white, opacity: 0.9, fontSize: 14 },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.white },
  headerSub: { fontFamily: fonts.bodySemi, color: colors.white, fontSize: 16, marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, gap: 10, marginBottom: spacing.md },
  label: { fontFamily: fonts.bodySemi, color: colors.ink },
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  hint: { fontFamily: fonts.body, color: colors.inkMuted },
  empty: { fontFamily: fonts.bodySemi, color: colors.inkMuted, paddingVertical: 4 },
  input: { backgroundColor: colors.mist, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  slot: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.mist },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  dayTextOn: { color: colors.white },
  times: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { flex: 1, maxWidth: 120, textAlign: 'center' },
  dash: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
  remove: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF1EC', alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' },
  check: { color: colors.white, fontFamily: fonts.bodyBold },
  toggleText: { flex: 1, fontFamily: fonts.bodySemi, color: colors.ink },
  error: { fontFamily: fonts.bodySemi, color: colors.coral, marginBottom: 8 },
  saved: { fontFamily: fonts.bodySemi, color: colors.leafDeep, marginBottom: 8 },
});
