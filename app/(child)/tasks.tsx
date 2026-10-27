import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { CompanionStatus } from '@/components/CompanionStatus';
import { COMPANIONS } from '@/components/KikoMascot';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { TaskChecklist } from '@/components/TaskChecklist';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function ChildTasks() {
  const { state, toggleTask, addTask, removeTask, allTasksDone } = useFamily();
  const { expression, react } = useCompanionReaction('encourage');
  const [title, setTitle] = useState('');
  const companionName = COMPANIONS[state.child?.companion ?? 'bear'].name;
  const done = state.tasks.filter(task => task.done).length;

  const submit = async () => {
    if (!title.trim()) return;
    await addTask(title, { addedBy: 'child' });
    setTitle('');
    react('focused', 3000);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>📝 Mis tareas</Text>
      <Text style={styles.hint}>
        {state.focusActive && allTasksDone ? '🎉 ¡Ya puedes jugar en Mundos!' : 'Toca la casilla cuando termines.'}
      </Text>
      {state.tasks.length ? (
        <View style={styles.stars} accessibilityLabel={`${done} de ${state.tasks.length} tareas hechas`}>
          {state.tasks.map(task => <Text key={task.id} style={[styles.star, !task.done && styles.starOff]}>⭐</Text>)}
        </View>
      ) : null}

      <CompanionStatus expression={expression} message={allTasksDone ? '¡Buen trabajo! Tu lista está completa.' : 'Vamos una tarea a la vez.'} />
      <View style={styles.addBox}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          returnKeyType="done"
          placeholder="Nueva tarea…"
          placeholderTextColor={colors.inkMuted}
          accessibilityLabel="Escribe una tarea nueva"
          style={styles.input}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Agregar tarea" onPress={submit} style={({ pressed }) => [styles.addButton, !title.trim() && styles.addDisabled, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Text style={styles.addIcon}>＋</Text>
        </Pressable>
      </View>

      {state.tasks.filter(task => task.assessment).map(task => <View key={task.id} style={styles.assessment}><Text style={styles.assessmentTitle}>{task.assessment?.mode === 'exam' ? '📝' : '🌱'} {task.title}</Text><Text style={styles.hint}>{task.assessmentResult ? `${task.assessmentResult.right}/${task.assessmentResult.total} respuestas correctas` : 'Asignado por tus padres · listo para estudiar'}</Text><PrimaryButton label={task.assessmentResult ? 'Ver resultado o repasar' : 'Empezar'} onPress={() => router.push({ pathname: '/(child)/practice/[id]', params: { id: task.id } })} /></View>)}
      <TaskChecklist
        tasks={state.tasks.filter(task => !task.assessment)}
        onToggle={async id => {
          const task = state.tasks.find(item => item.id === id);
          await toggleTask(id);
          if (task && !task.done) react(state.tasks.every(item => item.id === id || item.done) ? 'celebrate' : 'correct', 4500);
          else react('encourage', 2500);
        }}
        onRemove={removeTask}
        editable
        courses={state.courses}
      />

      <PrimaryButton
        label={`🙋 Pedir ayuda a ${companionName}`}
        variant="secondary"
        onPress={() => router.push('/(child)/tutor')}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  assessment: { backgroundColor: colors.white, borderRadius: 22, padding: 20, gap: 10, marginBottom: 16 },
  assessmentTitle: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 20 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  hint: {
    marginTop: 8,
    marginBottom: spacing.md,
    fontFamily: fonts.bodySemi,
    color: colors.inkMuted,
    fontSize: 17,
  },
  addBox: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  addButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  addDisabled: { opacity: 0.5 },
  addIcon: { color: colors.white, fontSize: 32, fontFamily: fonts.displayBold, lineHeight: 36 },
  stars: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -8, marginBottom: 8 },
  star: { fontSize: 28 },
  starOff: { opacity: 0.25 },
  input: {
    flex: 1,
    minHeight: 60,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
});
