import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

const day = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const DUE = [{ label: 'Sin fecha', offset: null }, { label: 'Hoy', offset: 0 }, { label: 'Mañana', offset: 1 }, { label: 'En 2 días', offset: 2 }, { label: 'En una semana', offset: 7 }] as const;

export default function ParentTasks() {
  const { state, addTask, toggleTask, removeTask } = useFamily();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [courseId, setCourseId] = useState('');
  const [due, setDue] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) return setError('Escribe la tarea.');
    try {
      await addTask(title, { courseId: courseId || undefined, dueDate: due === null ? undefined : day(due), note, addedBy: 'parent' });
      setTitle(''); setNote(''); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la tarea.'); }
  };
  const shown = state.tasks.filter((t) => !filter || t.courseId === filter);
  const pending = shown.filter((t) => !t.done).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const done = shown.filter((t) => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const late = pending.filter((t) => t.dueDate && t.dueDate < day(0)).length;
  const coursesWithTasks = state.courses.filter((c) => state.tasks.some((t) => t.courseId === c.id));

  return (
    <Screen scroll>
      <Text style={styles.title}>Tareas de {state.child?.name ?? 'tu hijo'}</Text>
      <Text style={styles.hint}>Sube las tareas del colegio con su curso y fecha. Ves cuáles hizo, cuándo, y las que añadió por su cuenta. Cuando todas estén hechas, el modo enfoque se apaga solo.</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryItem}>⏳ {pending.length} pendientes</Text>
        <Text style={styles.summaryItem}>✅ {done.length} hechas</Text>
        {late ? <Text style={[styles.summaryItem, { color: colors.coral }]}>⚠️ {late} vencidas</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nueva tarea</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ej. Matemáticas página 12, ejercicios 1 al 5" placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={160} />
        <Text style={styles.label}>Curso</Text>
        <View style={styles.chips}>
          <Chip label="Ninguno" on={!courseId} onPress={() => setCourseId('')} />
          {state.courses.map((c) => <Chip key={c.id} label={c.title} on={courseId === c.id} color={c.color} onPress={() => setCourseId(c.id)} />)}
        </View>
        <Text style={styles.label}>Para cuándo</Text>
        <View style={styles.chips}>
          {DUE.map((d) => <Chip key={d.label} label={d.label} on={due === d.offset} onPress={() => setDue(d.offset)} />)}
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Nota para el niño o para ti (opcional)" placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={300} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Añadir tarea" onPress={submit} />
      </View>

      {coursesWithTasks.length ? (
        <View style={[styles.chips, { marginBottom: spacing.md }]}>
          <Chip label="Todas" on={!filter} onPress={() => setFilter('')} />
          {coursesWithTasks.map((c) => <Chip key={c.id} label={c.title} on={filter === c.id} color={c.color} onPress={() => setFilter(c.id)} />)}
        </View>
      ) : null}

      <Text style={styles.section}>Pendientes</Text>
      <TaskChecklist tasks={pending} onToggle={toggleTask} onRemove={removeTask} editable courses={state.courses} forParent />
      {done.length ? (
        <>
          <Text style={[styles.section, { marginTop: spacing.lg }]}>Hechas</Text>
          <TaskChecklist tasks={done} onToggle={toggleTask} onRemove={removeTask} editable courses={state.courses} forParent />
        </>
      ) : null}
    </Screen>
  );
}

function Chip({ label, on, onPress, color }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, on && { backgroundColor: color ?? colors.skyDeep }]}>
      <Text style={[styles.chipText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink },
  hint: { marginTop: 8, marginBottom: spacing.md, fontFamily: fonts.body, color: colors.inkMuted },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: spacing.md },
  summaryItem: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 16 },
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: 16, gap: 10, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 13 },
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, marginBottom: 10 },
  input: { backgroundColor: colors.paper, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.mist, borderRadius: radii.pill, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodySemi, color: colors.ink },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
