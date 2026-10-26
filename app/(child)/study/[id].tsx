import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { getAgeBand } from '@/lib/ages';
import { useFamily } from '@/lib/store';
import { requestLesson, type StudyLesson } from '@/lib/study';
import { courseProgress, MONTHS, mergeTopics, passed, syllabusFor } from '@/lib/study-plan';
import type { CourseTopic } from '@/lib/types';

type Phase = 'overview' | 'loading' | 'lesson' | 'quiz' | 'result';
const STARS_FOR_TOPIC = 2;

export default function StudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, finishTopic, setCourseTopics, toggleTask } = useFamily();
  const course = state.courses.find((c) => c.id === id);
  const [phase, setPhase] = useState<Phase>('overview');
  const [topic, setTopic] = useState<CourseTopic | null>(null);
  const [lesson, setLesson] = useState<StudyLesson | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [question, setQuestion] = useState(0);
  const [error, setError] = useState('');
  const [freeTopic, setFreeTopic] = useState('');

  useEffect(() => () => { Speech.stop(); }, []);

  if (!course || !state.child) {
    return (
      <Screen scroll>
        <Text style={styles.title}>Curso no encontrado</Text>
        <PrimaryButton label="Ver mis cursos" onPress={() => router.replace('/(child)/courses')} />
      </Screen>
    );
  }
  const progress = courseProgress(course);
  const topics = course.topics ?? [];
  const tasks = state.tasks.filter((t) => t.courseId === course.id && !t.done);
  const right = lesson ? answers.filter((a, i) => a === lesson.quiz[i]?.answer).length : 0;

  const start = async (target: CourseTopic, again = false) => {
    Speech.stop();
    setTopic(target); setPhase('loading'); setError(''); setAnswers([]); setQuestion(0);
    try {
      const plan = syllabusFor(course, target.title);
      const next = await requestLesson({ ageBand: getAgeBand(state.child!.age), course: course.title, topic: target.title, done: plan.done.filter((t) => t !== target.title), next: plan.next, retry: again });
      setLesson(next); setPhase('lesson');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar la lección.'); setPhase('overview');
    }
  };
  const addAndStudy = async () => {
    const title = freeTopic.trim().slice(0, 120);
    if (!title) return;
    const existing = topics.find((t) => t.title.toLowerCase() === title.toLowerCase());
    if (existing) return start(existing);
    const updated = mergeTopics(topics, [{ title }], () => `topic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
    await setCourseTopics(course.id, updated);
    setFreeTopic('');
    void start(updated[updated.length - 1]);
  };
  const answer = (option: number) => {
    if (answers[question] !== undefined) return;
    setAnswers((list) => { const next = [...list]; next[question] = option; return next; });
  };
  const finishQuiz = async () => {
    if (!lesson || !topic) return;
    const total = lesson.quiz.length;
    const ok = passed(right, total);
    setPhase('result');
    await finishTopic(course.id, topic.id, { right, total }, ok && !topic.done ? STARS_FOR_TOPIC : 0).catch(() => {});
  };
  const speak = (text: string) => { Speech.stop(); Speech.speak(text, { language: 'es-ES', rate: 0.95 }); };
  const askTutor = (title: string) => router.push({ pathname: '/(child)/tutor', params: { course: course.id, topic: title } });

  return (
    <Screen scroll>
      <View style={[styles.header, { backgroundColor: course.color }]}>
        <Text style={styles.kicker}>📖 Modo estudio</Text>
        <Text style={styles.headerTitle}>{course.title}</Text>
        {progress.total ? (
          <>
            <View style={styles.bar} accessibilityLabel={`${progress.done} de ${progress.total} temas terminados`}>
              <View style={[styles.barFill, { width: `${Math.max(4, progress.percent)}%` }]} />
            </View>
            <Text style={styles.headerSub}>{progress.done} de {progress.total} temas · {progress.percent}%</Text>
          </>
        ) : <Text style={styles.headerSub}>Todavía no hay temario para este curso.</Text>}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {phase === 'loading' ? (
        <View style={styles.card}>
          <ActivityIndicator color={course.color} size="large" />
          <Text style={styles.center}>Preparando la lección de «{topic?.title}»…</Text>
        </View>
      ) : null}

      {phase === 'lesson' && lesson && topic ? (
        <View style={styles.card}>
          <Text style={styles.section}>{lesson.title}</Text>
          <Text style={styles.body}>{lesson.explain}</Text>
          {lesson.points.length ? <View style={styles.points}>{lesson.points.map((p) => <Text key={p} style={styles.point}>⭐ {p}</Text>)}</View> : null}
          {lesson.example ? <View style={styles.example}><Text style={styles.label}>Ejemplo</Text><Text style={styles.body}>{lesson.example}</Text></View> : null}
          <PrimaryButton label="🔊 Escuchar" variant="ghost" onPress={() => speak([lesson.explain, ...lesson.points, lesson.example].join('. '))} />
          <PrimaryButton label="✅ Ya lo entendí: hacer la prueba" onPress={() => { Speech.stop(); setPhase('quiz'); }} />
          <PrimaryButton label="✏️ Tengo una duda: preguntar al tutor" variant="secondary" onPress={() => askTutor(topic.title)} />
        </View>
      ) : null}

      {phase === 'quiz' && lesson ? (() => {
        const item = lesson.quiz[question];
        const chosen = answers[question];
        const last = question === lesson.quiz.length - 1;
        return (
          <View style={styles.card}>
            <Text style={styles.label}>Pregunta {question + 1} de {lesson.quiz.length}</Text>
            <Text style={styles.section}>{item.q}</Text>
            {item.options.map((option, i) => {
              const look = chosen === undefined ? 'idle' : i === item.answer ? 'right' : i === chosen ? 'wrong' : 'idle';
              return (
                <Pressable key={i} accessibilityRole="button" accessibilityState={{ selected: chosen === i, disabled: chosen !== undefined }} onPress={() => answer(i)} style={[styles.option, look === 'right' && styles.optionRight, look === 'wrong' && styles.optionWrong]}>
                  <Text style={styles.optionText}>{look === 'right' ? '✓ ' : look === 'wrong' ? '✗ ' : ''}{option}</Text>
                </Pressable>
              );
            })}
            {chosen !== undefined ? (
              <>
                <Text style={[styles.body, { color: chosen === item.answer ? colors.leafDeep : colors.coral }]}>{chosen === item.answer ? '¡Muy bien! ' : 'Casi. '}{item.why}</Text>
                <PrimaryButton label={last ? 'Ver resultado' : 'Siguiente pregunta'} onPress={() => (last ? void finishQuiz() : setQuestion(question + 1))} />
              </>
            ) : null}
          </View>
        );
      })() : null}

      {phase === 'result' && lesson && topic ? (
        <View style={styles.card}>
          {passed(right, lesson.quiz.length) ? (
            <>
              <Text style={styles.big}>🎉</Text>
              <Text style={styles.section}>¡Tema superado! {right} de {lesson.quiz.length}</Text>
              <Text style={styles.body}>{topic.done ? 'Ya lo tenías aprendido y lo repasaste muy bien.' : `Ganaste ${STARS_FOR_TOPIC} ★ y pasas al siguiente tema.`}</Text>
            </>
          ) : (
            <>
              <Text style={styles.big}>💪</Text>
              <Text style={styles.section}>{right} de {lesson.quiz.length}. ¡Vamos a repasarlo!</Text>
              <Text style={styles.body}>Te lo explico de otra forma y lo intentas otra vez.</Text>
              <PrimaryButton label="🔁 Explicármelo de otra forma" onPress={() => void start(topic, true)} />
            </>
          )}
          <PrimaryButton label="Volver al temario" variant="secondary" onPress={() => { setPhase('overview'); setLesson(null); }} />
        </View>
      ) : null}

      {phase === 'overview' ? (
        <>
          {progress.current ? (
            <View style={styles.card}>
              <Text style={styles.label}>Te toca estudiar</Text>
              <Text style={styles.section}>{progress.current.title}</Text>
              {progress.current.month ? <Text style={styles.hint}>Se ve en clase en {MONTHS[progress.current.month - 1]}</Text> : null}
              <PrimaryButton label="📖 Empezar lección" onPress={() => void start(progress.current!)} />
              <PrimaryButton label="✏️ Estudiarlo con el tutor" variant="secondary" onPress={() => askTutor(progress.current!.title)} />
            </View>
          ) : progress.total ? (
            <View style={styles.card}>
              <Text style={styles.big}>🏆</Text>
              <Text style={styles.section}>¡Terminaste todo el temario!</Text>
              <Text style={styles.hint}>Puedes repasar cualquier tema tocándolo abajo.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.hint}>Pide a mamá o papá que suban los temas del año en el panel de padres (pestaña Cursos). Mientras tanto, escribe el tema que estás viendo en clase:</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>¿Estás viendo otro tema en clase?</Text>
            <TextInput value={freeTopic} onChangeText={setFreeTopic} onSubmitEditing={() => void addAndStudy()} placeholder="Ej. Las fracciones" placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={120} />
            <PrimaryButton label="Estudiar este tema" variant="secondary" onPress={() => void addAndStudy()} disabled={!freeTopic.trim()} />
          </View>

          {tasks.length ? (
            <View style={styles.card}>
              <Text style={styles.section}>📝 Tareas de {course.title}</Text>
              {tasks.map((t) => (
                <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} onPress={() => void toggleTask(t.id)} style={styles.task}>
                  <View style={styles.box} />
                  <Text style={styles.taskText}>{t.title}{t.dueDate ? ` · para el ${t.dueDate.slice(8)}/${t.dueDate.slice(5, 7)}` : ''}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {topics.length ? (
            <View style={styles.card}>
              <Text style={styles.section}>🗺️ Temario del año</Text>
              {topics.map((t, i) => (
                <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Estudiar ${t.title}`} onPress={() => void start(t)} style={[styles.topic, t.id === progress.current?.id && { borderColor: course.color }]}>
                  <Text style={styles.topicIcon}>{t.done ? '✅' : t.id === progress.current?.id ? '👉' : `${i + 1}.`}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topicText, t.done && styles.topicDone]}>{t.title}</Text>
                    {t.month || t.score ? <Text style={styles.hint}>{[t.month && MONTHS[t.month - 1], t.score && `prueba ${t.score.right}/${t.score.total}`].filter(Boolean).join(' · ')}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, marginBottom: spacing.md },
  header: { borderRadius: radii.lg, padding: 20, marginBottom: spacing.md, gap: 6 },
  kicker: { fontFamily: fonts.bodyBold, color: colors.white, opacity: 0.9, fontSize: 14 },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.white },
  headerSub: { fontFamily: fonts.bodySemi, color: colors.white, fontSize: 16 },
  bar: { height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden', marginTop: 6 },
  barFill: { height: 14, borderRadius: 7, backgroundColor: colors.white },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, gap: 10, marginBottom: spacing.md },
  section: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, color: colors.inkMuted, fontSize: 14 },
  body: { fontFamily: fonts.body, fontSize: 18, lineHeight: 27, color: colors.ink },
  hint: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 15 },
  center: { fontFamily: fonts.bodySemi, color: colors.ink, textAlign: 'center', fontSize: 17 },
  error: { fontFamily: fonts.bodySemi, color: colors.coral, marginBottom: spacing.sm, fontSize: 16 },
  points: { gap: 6, backgroundColor: colors.mist, borderRadius: radii.md, padding: 12 },
  point: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  example: { backgroundColor: '#FFF8E6', borderRadius: radii.md, padding: 12, gap: 4 },
  option: { minHeight: 56, borderRadius: radii.md, borderWidth: 2, borderColor: colors.mist, backgroundColor: colors.paper, paddingHorizontal: 16, justifyContent: 'center' },
  optionRight: { borderColor: colors.leafDeep, backgroundColor: '#E6F8EF' },
  optionWrong: { borderColor: colors.coral, backgroundColor: '#FFF1EC' },
  optionText: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.ink },
  big: { fontSize: 48, textAlign: 'center' },
  input: { backgroundColor: colors.mist, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  box: { width: 30, height: 30, borderRadius: 9, borderWidth: 3, borderColor: colors.sky },
  taskText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.md, borderWidth: 2, borderColor: 'transparent' },
  topicIcon: { width: 34, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.inkMuted, textAlign: 'center' },
  topicText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  topicDone: { color: colors.inkMuted },
});
