import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ParentTasks() {
  const { state, addTask, toggleTask, removeTask } = useFamily();
  const [title, setTitle] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    await addTask(title);
    setTitle('');
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Tareas del día</Text>
      <Text style={styles.hint}>Cuando todas estén hechas, el modo enfoque se apaga solo.</Text>

      <View style={styles.addRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ej. Matemáticas página 12"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
        />
        <PrimaryButton label="Añadir" onPress={submit} style={styles.addBtn} />
      </View>

      <TaskChecklist
        tasks={state.tasks}
        onToggle={toggleTask}
        onRemove={removeTask}
        editable
      />
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
  addRow: { gap: 10, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  addBtn: { alignSelf: 'stretch' },
});
