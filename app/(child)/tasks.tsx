import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildTasks() {
  const { state, toggleTask, addTask, removeTask, allTasksDone } = useFamily();
  const [title, setTitle] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    await addTask(title);
    setTitle('');
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
        onToggle={toggleTask}
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
