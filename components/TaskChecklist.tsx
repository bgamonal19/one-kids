import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/constants/theme';
import type { CourseItem, TaskItem } from '@/lib/types';

const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Course, due date and, for parents, who added it and when it was finished. */
export function taskMeta(task: TaskItem, courses: CourseItem[] = [], forParent = false): string {
  const course = task.courseId ? courses.find((c) => c.id === task.courseId)?.title : '';
  const late = !task.done && task.dueDate && task.dueDate < localDay();
  const parts = [
    course && `📚 ${course}`,
    task.dueDate && `${late ? '⚠️ vencida el' : '📅 para el'} ${shortDate(task.dueDate)}`,
    forParent && task.addedBy === 'child' && '🧒 la añadió por su cuenta',
    forParent && task.done && task.doneAt && `✓ hecha el ${shortDate(localDay(new Date(task.doneAt)))} ${new Date(task.doneAt).toTimeString().slice(0, 5)}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

type Props = {
  tasks: TaskItem[];
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  editable?: boolean;
  courses?: CourseItem[];
  forParent?: boolean;
};

export function TaskChecklist({ tasks, onToggle, onRemove, editable, courses, forParent }: Props) {
  if (tasks.length === 0) {
    return <Text style={styles.empty}>🌈 Todavía no hay tareas. ¡Añade la primera!</Text>;
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <View key={task.id} style={styles.row}>
          <Pressable onPress={() => onToggle(task.id)} style={styles.main} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}>
            <View style={[styles.box, task.done && styles.boxOn]}>
              {task.done ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
              {taskMeta(task, courses, forParent) ? <Text style={styles.meta}>{taskMeta(task, courses, forParent)}</Text> : null}
              {forParent && task.note ? <Text style={styles.meta}>📝 {task.note}</Text> : null}
            </View>
          </Pressable>
          {editable && onRemove ? (
            <Pressable onPress={() => onRemove(task.id)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Quitar la tarea ${task.title}`} style={styles.remove}>
              <Text style={styles.removeIcon}>🗑️</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    minHeight: 68,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minHeight: 52 },
  box: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.leaf, borderColor: colors.leafDeep },
  check: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 22 },
  title: { flex: 1, fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 18 },
  meta: { marginTop: 2, fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14 },
  titleDone: { textDecorationLine: 'line-through', color: colors.inkMuted },
  remove: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF1EC', alignItems: 'center', justifyContent: 'center' },
  removeIcon: { fontSize: 20 },
  empty: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 17, textAlign: 'center', paddingVertical: 16 },
});
