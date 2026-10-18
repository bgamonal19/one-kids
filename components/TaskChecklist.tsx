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
    return <Text style={styles.empty}>Todavía no hay tareas. ¡El padre puede agregarlas!</Text>;
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <View key={task.id} style={styles.row}>
          <Pressable onPress={() => onToggle(task.id)} style={styles.main} accessibilityRole="checkbox">
            <View style={[styles.box, task.done && styles.boxOn]}>
              {task.done ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
          </Pressable>
          {editable && onRemove ? (
            <Pressable onPress={() => onRemove(task.id)} hitSlop={8}>
              <Text style={styles.remove}>Quitar</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.leaf, borderColor: colors.leafDeep },
  check: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 14 },
  title: { flex: 1, fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 16 },
  titleDone: { textDecorationLine: 'line-through', color: colors.inkMuted },
  remove: { fontFamily: fonts.bodySemi, color: colors.coral, fontSize: 13 },
  empty: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 15 },
});
