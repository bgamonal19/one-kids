import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { GradePicker } from '@/components/GradePicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { getAgeBand } from '@/lib/ages';
import { requestAssessment } from '@/lib/study';
import { assessmentHtml } from '@/lib/assessments';
import { printDocument } from '@/lib/print';
import type { Assessment } from '@/lib/types';

export default function ParentAssessments() {
  const { state, addTask } = useFamily();
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? '');
  const [customCourse, setCustomCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [country, setCountry] = useState(state.child?.country || 'Otro');
  const [grade, setGrade] = useState(state.child?.grade || '');
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [difficulty, setDifficulty] = useState('grado');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ childId: string; sheet: Assessment }>();
  const [showKey, setShowKey] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState('');
  const sheet = draft && draft.childId === state.child?.id ? draft.sheet : undefined;
  const course = state.courses.find(c => c.id === courseId);
  const courseName = course?.title || customCourse.trim();
  const generate = async () => {
    if (!state.child) return;
    const childId = state.child.id;
    setBusy(true); setError(''); setAssigned(false); setShowKey(false); setDraft(undefined);
    try { const result = await requestAssessment({ ageBand: getAgeBand(state.child.age), course: courseName, topic: topic.trim(), grade, count, mode, difficulty }); setDraft({ childId, sheet: result }); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar.'); }
    finally { setBusy(false); }
  };
  const assign = async () => {
    if (!sheet || assigned) return;
    setBusy(true); setError('');
    try { await addTask(`${sheet.mode === 'exam' ? 'Examen' : 'Práctica'}: ${sheet.title}`, { courseId: state.courses.find(c => c.title === sheet.course)?.id, addedBy: 'parent', assessment: sheet }); setAssigned(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo asignar.'); }
    finally { setBusy(false); }
  };
  const print = async (answers: boolean) => {
    if (!sheet) return;
    try { await printDocument(assessmentHtml(sheet, state.child?.name || '', answers)); }
    catch { setError('No se pudo abrir la impresión. Revisa los permisos del navegador.'); }
  };
  const choices = <T extends string | number,>(values: { value: T; label: string }[], selected: T, choose: (value: T) => void) => <View style={s.row}>{values.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: selected === item.value }} disabled={busy} onPress={() => choose(item.value)} style={[s.chip, selected === item.value && s.on]}><Text style={s.text}>{item.label}</Text></Pressable>)}</View>;
  return <Screen scroll wide>
    <Text style={s.title}>📝 Exámenes y prácticas</Text>
    <Text style={s.hint}>Prepara material para {state.child?.name || 'tu estudiante'}, revísalo y asígnalo a sus tareas o imprímelo. La generación con IA cuenta dentro del uso del tutor.</Text>
    <View style={s.card}>
      <Text style={s.label}>¿Qué quieres preparar?</Text>
      {choices([{ value: 'practice' as const, label: '🌱 Práctica guiada' }, { value: 'exam' as const, label: '📝 Examen' }], mode, setMode)}
      <Text style={s.hint}>{mode === 'practice' ? 'El estudiante recibe una explicación al responder cada pregunta.' : 'Las respuestas se revisan juntas después de entregar el examen.'}</Text>
      <Text style={s.label}>Curso</Text>
      {choices([...state.courses.map(c => ({ value: c.id, label: c.title })), { value: '', label: 'Otro curso' }], courseId, setCourseId)}
      {!course ? <TextInput accessibilityLabel="Nombre del curso" value={customCourse} onChangeText={setCustomCourse} placeholder="Escribe el curso" style={s.input} /> : null}
      <GradePicker country={country} grade={grade} onCountryChange={setCountry} onGradeChange={setGrade} />
      <Text style={s.label}>Tema o temas que debe estudiar</Text>
      <TextInput accessibilityLabel="Temas del examen o práctica" value={topic} onChangeText={setTopic} maxLength={300} multiline placeholder="Por ejemplo: fracciones, sumas y restas con distinto denominador" style={[s.input, { minHeight: 90 }]} />
      {course?.topics?.length ? choices(course.topics.slice(0, 8).map(t => ({ value: t.title, label: t.title })), topic, setTopic) : null}
      <Text style={s.label}>Cantidad de preguntas</Text>
      {choices([5, 10, 15].map(value => ({ value, label: `${value} preguntas` })), count, setCount)}
      <Text style={s.label}>Dificultad</Text>
      {choices([{ value: 'refuerzo', label: 'Refuerzo' }, { value: 'grado', label: 'Según su grado' }, { value: 'reto', label: 'Un reto mayor' }], difficulty, setDifficulty)}
      <PrimaryButton label={busy ? 'Preparando y revisando…' : `Generar ${mode === 'exam' ? 'examen' : 'práctica'} con IA`} disabled={busy || !courseName || !topic.trim() || !grade} onPress={() => void generate()} />
      {busy ? <ActivityIndicator accessibilityLabel="Preparando material" color={colors.coral} /> : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {sheet ? <View style={s.card}>
      <Text style={s.title}>{sheet.title}</Text><Text style={s.hint}>{sheet.instructions}</Text>
      <PrimaryButton label={assigned ? '✓ Asignado en Mis tareas' : `Asignar a ${state.child?.name || 'mi estudiante'}`} disabled={busy || assigned} onPress={() => void assign()} />
      <PrimaryButton label="🖨️ Imprimir hoja / guardar como PDF" variant="secondary" onPress={() => void print(false)} />
      <PrimaryButton label={showKey ? 'Ocultar solucionario' : 'Ver solucionario para padres'} variant="ghost" onPress={() => setShowKey(!showKey)} />
      {sheet.questions.map((q, i) => <View key={i} style={s.question}><Text style={s.label}>{i + 1}. {q.q}</Text>{q.options.map((option, j) => <Text key={j} style={s.text}>{String.fromCharCode(65 + j)}. {option}</Text>)}{showKey ? <Text style={s.answer}>✓ {String.fromCharCode(65 + q.answer)} · {q.why}</Text> : null}</View>)}
      {showKey ? <PrimaryButton label="Imprimir solucionario separado" variant="secondary" onPress={() => void print(true)} /> : null}
    </View> : null}
    <Text style={s.label}>Material asignado a {state.child?.name}</Text>
    {state.tasks.filter(t => t.assessment).map(task => <View key={task.id} style={s.card}><Text style={s.label}>{task.title}</Text><Text style={s.hint}>{task.assessmentResult ? `${task.assessmentResult.right}/${task.assessmentResult.total} respuestas correctas · ${new Date(task.assessmentResult.submittedAt).toLocaleDateString('es-ES')}` : 'Pendiente de responder · disponible en Mis tareas'}</Text></View>)}
  </Screen>;
}
const s = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 27, color: colors.ink, marginVertical: 12 },
  hint: { fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, lineHeight: 23 },
  label: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, marginTop: 8 },
  text: { fontFamily: fonts.body, color: colors.ink, fontSize: 16 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 12, marginVertical: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', padding: 12, borderRadius: 14, borderWidth: 2, borderColor: colors.mist },
  on: { borderColor: colors.sky, backgroundColor: '#E6F4FF' },
  input: { borderWidth: 2, borderColor: colors.mist, borderRadius: 14, padding: 14, fontFamily: fonts.body, color: colors.ink, fontSize: 16 },
  question: { gap: 10, borderTopWidth: 1, borderColor: colors.mist, paddingTop: 15 },
  answer: { fontFamily: fonts.bodySemi, color: colors.leafDeep, backgroundColor: '#E9F7EB', padding: 12, borderRadius: 12 },
  error: { fontFamily: fonts.bodySemi, color: '#A43123', padding: 15 },
});
