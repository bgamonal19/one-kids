import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { readSyllabusPhoto } from '@/lib/study';
import { courseProgress, mergeTopics, MONTHS, parseTopicList, type ParsedTopic } from '@/lib/study-plan';
import type { CourseItem } from '@/lib/types';

const topicId = () => `topic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export default function ParentCourses() {
  const { state } = useFamily();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Screen scroll>
      <Text style={styles.title}>Temario del año</Text>
      <Text style={styles.hint}>Sube los temas de cada curso de {state.child?.name ?? 'tu hijo'}. El modo estudio los sigue en orden: explica el tema, hace una prueba corta y, si la supera, pasa al siguiente. Puedes escribirlos, pegarlos o tomar una foto de la lista del colegio.</Text>
      {state.courses.map((c) => <CourseSyllabus key={c.id} course={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />)}
      {!state.courses.length ? <Text style={styles.hint}>Primero crea los cursos desde Cursos en el modo niño.</Text> : null}
    </Screen>
  );
}

function CourseSyllabus({ course, open, onToggle }: { course: CourseItem; open: boolean; onToggle: () => void }) {
  const { setCourseTopics } = useFamily();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedTopic[] | null>(null);
  const [busy, setBusy] = useState<'photo' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const topics = course.topics ?? [];
  const progress = courseProgress(course);

  const save = async (next: typeof topics) => {
    setBusy('save'); setError('');
    try { await setCourseTopics(course.id, next); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(null); }
  };
  const addParsed = async (parsed: ParsedTopic[]) => {
    if (!parsed.length) return setError('No encontré temas. Escribe uno por línea.');
    await save(mergeTopics(topics, parsed, topicId));
    setText(''); setPreview(null);
  };
  const photo = async (camera: boolean) => {
    setBusy('photo'); setError(''); setPreview(null);
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('No se pudo abrir la cámara. Usa «Subir foto» o habilita el permiso.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > 1800) context.resize(asset.width > asset.height ? { width: 1800 } : { height: 1800 });
      const prepared = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
      if (!prepared.base64 || prepared.base64.length > 2_450_000) throw new Error('La foto es muy grande. Toma otra más cerca de la lista.');
      const read = await readSyllabusPhoto(`data:image/jpeg;base64,${prepared.base64}`, course.title);
      if (read.unreadable) throw new Error('No pude leer los temas. Prueba con una foto más nítida y con buena luz.');
      setPreview(read.topics.map((t) => (t.month ? { title: t.title, month: t.month } : { title: t.title })));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer la foto.'); }
    finally { setBusy(null); }
  };

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.cardHead}>
        <View style={[styles.dot, { backgroundColor: course.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.course}>{course.title}</Text>
          <Text style={styles.meta}>{topics.length ? `${progress.done} de ${topics.length} temas · ${progress.percent}%${progress.current ? ` · ahora: ${progress.current.title}` : ' · ¡terminado!'}` : 'Sin temario todavía'}</Text>
        </View>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {topics.length ? <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(2, progress.percent)}%`, backgroundColor: course.color }]} /></View> : null}

      {open ? (
        <View style={{ gap: 10, marginTop: 12 }}>
          {topics.map((t, i) => (
            <View key={t.id} style={styles.topic}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={`Marcar ${t.title} como ${t.done ? 'pendiente' : 'aprendido'}`} onPress={() => void save(topics.map((x) => (x.id === t.id ? (x.done ? { ...x, done: false, doneAt: undefined } : { ...x, done: true, doneAt: new Date().toISOString() }) : x)))} style={[styles.box, t.done && styles.boxOn]}>
                {t.done ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topicText, t.done && styles.topicDone]}>{i + 1}. {t.title}</Text>
                <Text style={styles.meta}>{[t.month && MONTHS[t.month - 1], t.score && `prueba ${t.score.right}/${t.score.total}`, t.doneAt && `aprendido el ${new Date(t.doneAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Subir ${t.title}`} disabled={i === 0} onPress={() => { const next = [...topics]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; void save(next); }} style={[styles.small, i === 0 && { opacity: 0.3 }]}><Text>⬆️</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${t.title}`} onPress={() => void save(topics.filter((x) => x.id !== t.id))} style={styles.small}><Text>🗑️</Text></Pressable>
            </View>
          ))}

          <Text style={styles.label}>Añadir temas (uno por línea; una línea con el mes, como «Marzo», agrupa los de abajo)</Text>
          <TextInput value={text} onChangeText={setText} multiline placeholder={'Marzo\nNúmeros hasta el 1000\nSumas llevando\nAbril\nFracciones'} placeholderTextColor={colors.inkMuted} style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]} />
          <PrimaryButton label={busy === 'save' ? 'Guardando…' : 'Añadir temas'} onPress={() => void addParsed(parseTopicList(text))} disabled={!text.trim() || busy !== null} />
          <View style={styles.row}>
            <PrimaryButton label="📷 Foto de la lista" variant="secondary" onPress={() => void photo(true)} disabled={busy !== null} style={{ flex: 1 }} />
            <PrimaryButton label="🖼️ Subir foto" variant="secondary" onPress={() => void photo(false)} disabled={busy !== null} style={{ flex: 1 }} />
          </View>
          {busy === 'photo' ? <View style={styles.row}><ActivityIndicator color={course.color} /><Text style={styles.meta}>Leyendo los temas de la foto…</Text></View> : null}
          {preview ? (
            <View style={styles.preview}>
              <Text style={styles.label}>Encontré {preview.length} temas. Revísalos:</Text>
              {preview.map((t, i) => <Text key={i} style={styles.topicText}>• {t.title}{t.month ? ` (${MONTHS[t.month - 1]})` : ''}</Text>)}
              <PrimaryButton label={`Añadir ${preview.length} temas`} onPress={() => void addParsed(preview)} />
              <PrimaryButton label="Editarlos antes" variant="ghost" onPress={() => { setText(preview.map((t) => t.title).join('\n')); setPreview(null); }} />
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {topics.length ? (confirmClear ? (
            <View style={styles.row}>
              <PrimaryButton label="Sí, borrar todo" variant="danger" onPress={() => { setConfirmClear(false); void save([]); }} style={{ flex: 1 }} />
              <PrimaryButton label="Cancelar" variant="ghost" onPress={() => setConfirmClear(false)} style={{ flex: 1 }} />
            </View>
          ) : <PrimaryButton label="Borrar todo el temario" variant="ghost" onPress={() => setConfirmClear(true)} />) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink },
  hint: { marginTop: 8, marginBottom: spacing.lg, fontFamily: fonts.body, color: colors.inkMuted },
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: 16, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  course: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 18 },
  meta: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14 },
  chevron: { color: colors.inkMuted, fontSize: 14 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.mist, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 8, borderRadius: 4 },
  label: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 13 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicText: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 16 },
  topicDone: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  box: { width: 32, height: 32, borderRadius: 9, borderWidth: 3, borderColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.leaf, borderColor: colors.leafDeep },
  check: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 18 },
  small: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.paper, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { backgroundColor: colors.mist, borderRadius: radii.md, padding: 12, gap: 6 },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
