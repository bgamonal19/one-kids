import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { CompanionStatus } from '@/components/CompanionStatus';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildTasks() {
  const { state, toggleTask, addTask, removeTask, allTasksDone } = useFamily();
  const { expression, react } = useCompanionReaction('encourage');
  const [title, setTitle] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    await addTask(title);
    setTitle('');
    react('focused', 3000);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Mis tareas</Text>
      <Text style={styles.hint}>
        {state.focusActive
          ? allTasksDone
            ? '¡Excelente! Ya desbloqueaste Mundos.'
            : 'Márcalas al terminar. Si te trabas, abre el Tutor IA.'
          : 'Agrega y completa tus tareas del día.'}
      </Text>

      <CompanionStatus expression={expression} message={allTasksDone ? '¡Buen trabajo! Tu lista está completa.' : 'Vamos una tarea a la vez.'} />
      <View style={styles.addBox}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Nueva tarea…"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
        />
        <PrimaryButton label="Agregar" onPress={submit} />
      </View>

      <TaskChecklist
        tasks={state.tasks}
        onToggle={async id => {
          const task = state.tasks.find(item => item.id === id);
          await toggleTask(id);
          if (task && !task.done) react(state.tasks.every(item => item.id === id || item.done) ? 'celebrate' : 'correct', 4500);
          else react('encourage', 2500);
        }}
        onRemove={removeTask}
        editable
      />

      <PrimaryButton
        label="Pedir ayuda al Tutor IA"
        variant="secondary"
        onPress={() => router.push('/(child)/tutor')}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
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
  addBox: { gap: 10, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
});
