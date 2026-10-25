import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/constants/theme';
import type { TaskItem } from '@/lib/types';

type Props = {
  tasks: TaskItem[];
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  editable?: boolean;
};

export function TaskChecklist({ tasks, onToggle, onRemove, editable }: Props) {
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
            <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
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
  titleDone: { textDecorationLine: 'line-through', color: colors.inkMuted },
  remove: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF1EC', alignItems: 'center', justifyContent: 'center' },
  removeIcon: { fontSize: 20 },
  empty: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 17, textAlign: 'center', paddingVertical: 16 },
});
