import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import type { TaskItem } from '@/lib/types';

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useFamily();
  const task = state.tasks.find(t => t.id === id && t.assessment);
  if (!task) return <Screen><Text style={s.title}>Esta práctica no está disponible.</Text><Text style={s.hint}>Vuelve a Mis tareas y elige una práctica asignada a tu perfil.</Text></Screen>;
  return <Practice key={task.id} task={task} />;
}
function Practice({ task }: { task: TaskItem }) {
  const { submitAssessment } = useFamily();
  const sheet = task.assessment!;
  const [answers, setAnswers] = useState<number[]>(task.assessmentResult?.answers ?? sheet.questions.map(() => -1));
  const [submitted, setSubmitted] = useState(Boolean(task.assessmentResult));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answered = answers.filter(a => a >= 0).length;
  const right = sheet.questions.filter((q, i) => q.answer === answers[i]).length;
  const finish = async () => {
    setBusy(true); setError('');
    try { await submitAssessment(task.id, answers); setSubmitted(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Tus respuestas siguen aquí.'); }
    finally { setBusy(false); }
  };
  return <Screen scroll wide>
    <Text style={s.title}>{sheet.mode === 'exam' ? '📝 Examen' : '🌱 Práctica'} · {sheet.title}</Text>
    <Text style={s.hint}>{sheet.course} · {sheet.grade}</Text><Text style={s.hint}>{sheet.instructions}</Text>
    <Text style={s.progress}>{submitted ? `¡Terminado! ${right} de ${sheet.questions.length} respuestas correctas` : `${answered} de ${sheet.questions.length} respondidas`}</Text>
    {sheet.mode === 'exam' && !submitted ? <Text style={s.hint}>Responde con calma. Verás la corrección al entregar todas tus respuestas.</Text> : null}
    {sheet.questions.map((question, i) => {
      const feedback = submitted || (sheet.mode === 'practice' && answers[i] >= 0);
      return <View key={i} style={s.card}>
        <Text style={s.question}>{i + 1}. {question.q}</Text>
        {question.options.map((option, j) => <Pressable key={j} accessibilityRole="radio" accessibilityState={{ checked: answers[i] === j }} disabled={submitted || busy} onPress={() => setAnswers(current => current.map((value, k) => k === i ? j : value))} style={[s.option, answers[i] === j && s.selected, feedback && j === question.answer && s.correct]}><Text style={s.text}>{String.fromCharCode(65 + j)}. {option}</Text></Pressable>)}
        {feedback ? <Text style={[s.feedback, answers[i] !== question.answer && s.tryAgain]}>{answers[i] === question.answer ? '✓ ¡Bien!' : 'Vamos a repasarlo.'} {question.why}</Text> : null}
      </View>;
    })}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {!submitted ? <PrimaryButton label={busy ? 'Guardando…' : sheet.mode === 'exam' ? 'Entregar examen' : 'Terminar práctica'} disabled={answered !== sheet.questions.length || busy} onPress={() => void finish()} /> : <><Text style={s.hint}>Tu resultado ya está guardado para que tus padres puedan verlo.</Text><PrimaryButton label="Practicar otra vez" variant="secondary" onPress={() => { setSubmitted(false); setAnswers(sheet.questions.map(() => -1)); }} /></>}
  </Screen>;
}
const s = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, color: colors.ink, fontSize: 28, marginVertical: 12 },
  hint: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 16, lineHeight: 24, marginVertical: 6 },
  progress: { fontFamily: fonts.bodyBold, fontSize: 19, color: colors.leafDeep, paddingVertical: 15 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 20, gap: 12, marginBottom: 16 },
  question: { fontFamily: fonts.bodyBold, fontSize: 21, color: colors.ink, marginBottom: 8 },
  option: { minHeight: 56, borderWidth: 2, borderColor: colors.mist, borderRadius: 15, padding: 15, justifyContent: 'center' },
  selected: { borderColor: colors.sky, backgroundColor: '#E7F4FF' },
  correct: { borderColor: colors.leafDeep, backgroundColor: '#E8F6E9' },
  text: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.ink },
  feedback: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.leafDeep, lineHeight: 25, padding: 12 },
  tryAgain: { color: '#805800' },
  error: { color: '#A43123', fontFamily: fonts.bodySemi, marginVertical: 12 },
});
