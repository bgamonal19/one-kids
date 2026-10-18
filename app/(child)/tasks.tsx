import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildTasks() {
  const { state, toggleTask, allTasksDone } = useFamily();

  return (
    <Screen scroll>
      <Text style={styles.title}>Mis tareas</Text>
      <Text style={styles.hint}>
        {state.focusActive
          ? allTasksDone
            ? '¡Excelente! Ya desbloqueaste el tiempo libre.'
            : 'Márcalas cuando las termines. El tutor te puede ayudar.'
          : 'Practica con tu checklist del día.'}
      </Text>
      <TaskChecklist tasks={state.tasks} onToggle={toggleTask} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.md,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
});
