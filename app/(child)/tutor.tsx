import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HandwritingPad, type HandwritingPadHandle, type Stroke } from '@/components/HandwritingPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskCamera, type TaskPhoto } from '@/components/TaskCamera';
import { TutorUsageBar } from '@/components/TutorUsageBar';
import { TutorWhiteboard, type BoardPhase } from '@/components/TutorWhiteboard';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useTutorSpeech } from '@/hooks/useTutorSpeech';
import { VoicePicker } from '@/components/VoicePicker';
import { DEFAULT_VOICE, loadVoiceChoice, saveVoiceChoice, VOICE_SAMPLE, type VoiceChoice } from '@/lib/voices';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { askTutor, generatePicture, getTutorStatus, type TutorAccount, type BoardVisual, type ImageSearch, type TutorPhoto, type PictureRequest, type TutorAction, type TutorProvider, type TutorStatus } from '@/lib/tutor';
import { addEntry, dayKey, dayLabel, loadHistory, saveHistory, type TutorHistory } from '@/lib/tutor-history';
import type { CourseItem, TutorMessage } from '@/lib/types';
import { openBrowserAsync } from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { addMemory, courseEntries, readCourseMemory, saveCourseMemory, type CourseMemory } from '@/lib/course-memory';

type Message = TutorMessage & { source?: 'openai' | 'anthropic' | 'local' };
type Photo = { uri: string; data: string };
type Answer = { handwriting?: string; childLine?: string };
type Retry = { message: string; action: TutorAction; exercise: string; fresh: boolean; answer: Answer };
type Page = { key: string; lines: string[]; childLine?: string; reply?: string; replyId?: string; source?: Message['source']; visual?: BoardVisual | null; images?: ImageSearch[]; photos?: TutorPhoto[]; summary?: string[]; review?: string; drawingLabel?: string };
type InputMode = 'pen' | 'keys' | 'voice';
const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const labels = { openai: 'OpenAI', anthropic: 'Claude · Anthropic', local: 'Práctica sin IA' };
const actionMessages = {
  continue: 'Ya entendí. Continuemos con el siguiente paso.',
  simpler: 'Explícame este mismo paso con palabras más fáciles.',
  example: 'Muéstrame otro ejemplo para entender este paso.',
  hint: 'Dame una pista sin decirme la respuesta.',
  more: 'Cuéntame más sobre este tema.',
  map: 'Hazme un mapa conceptual de este tema.',
  draw: 'Dibújamelo en la pizarra.',
  images: '¿Qué imágenes puedo buscar para entenderlo mejor?',
  summary: 'Hazme un resumen de lo que hicimos.',
} as const;
const actionLines = { continue: 'Ya entendí 👍', simpler: 'Más fácil, por favor', example: 'Otro ejemplo', hint: 'Una pista', more: 'Cuéntame más', map: 'Un mapa conceptual', draw: 'Dibújamelo', images: 'Quiero ver imágenes', summary: 'Un resumen' } as const;
const actionButtons = { continue: 'Ya entendí · Seguir →', simpler: 'Más fácil', example: 'Otro ejemplo', hint: 'Una pista', more: '📚 Cuéntame más', map: '🗺️ Mapa conceptual', draw: '✏️ Dibújamelo', images: '🖼️ Imágenes', summary: '📝 Resumen' } as const;
// Wikimedia Commons: free, educational pictures; the link is built here from the AI's search words.
const imageSearchUrl = (query: string) => `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=image`;
const penColors = ['#1F3A5F', '#2C60AE', '#E2553A', '#23935F'] as const;
// The year's syllabus a parent uploads in study mode, if the course has one.
type Topic = { title: string; done?: boolean };
function syllabusOf(course?: CourseItem) {
  const topics = (course as (CourseItem & { topics?: Topic[] }) | undefined)?.topics;
  if (!Array.isArray(topics) || !topics.length) return null;
  const current = topics.find(t => !t.done);
  return { current: current?.title ?? '', done: topics.filter(t => t.done).map(t => t.title), next: topics.filter(t => !t.done && t !== current).map(t => t.title) };
}

export default function TutorScreen() {
  const { state } = useFamily();
  const age = state.child?.age ?? 8;
  const band = getAgeBand(age);
  // Study mode links here with ?course=<id>&topic=<title>.
  const params = useLocalSearchParams<{ course?: string; topic?: string }>();
  const [courseId, setCourseId] = useState(typeof params.course === 'string' ? params.course : '');
  const course = state.courses.find(c => c.id === courseId);
  const [courseMemory, setCourseMemory] = useState<CourseMemory>([]);
  const topic = useRef('');
  const [status, setStatus] = useState<TutorStatus | null>(null);
  // Parent settings and monthly usage; the open mode only shows when a parent enabled it.
  const [account, setAccount] = useState<TutorAccount | null>(null);
  const [tutorMode, setTutorMode] = useState<'tutor' | 'open'>('tutor');
  const openMode = tutorMode === 'open' && Boolean(account?.openMode);
  const [connectionError, setConnectionError] = useState('');
  const [provider, setProvider] = useState<TutorProvider>('auto');
  const greeting = `¡Hola${state.child?.name ? `, ${state.child.name}` : ''}!`;
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'tutor', text: `${greeting} Escribe, dibuja o dime tu duda, o añade una foto de tu tarea. Vamos a aprender un paso a la vez.` }]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stageWidth, setStageWidth] = useState(Math.min(width, 1100));
  const wide = stageWidth >= 700;
  const [phase, setPhase] = useState<BoardPhase>('writing');
  const [page, setPage] = useState<Page>({ key: 'welcome', lines: [greeting, '¿Qué aprendemos hoy?'] });
  const [pace, setPace] = useState(70);
  const [mode, setMode] = useState<InputMode>('pen');
  const [penColor, setPenColor] = useState<string>(penColors[0]);
  const [ink, setInk] = useState<Stroke[]>([]);
  const inked = ink.length > 0;
  const [fullscreen, setFullscreen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voice, setVoice] = useState<VoiceChoice>(DEFAULT_VOICE);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [history, setHistory] = useState<TutorHistory>({});
  const [historyDay, setHistoryDay] = useState(dayKey());
  const childId = state.child?.id ?? 'demo';
  const pad = useRef<HandwritingPadHandle>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  const stageY = useRef(0);
  const turn = useRef({ generation: 0, written: false, spoken: true });
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [needsRetake, setNeedsRetake] = useState(false);
  const [exercise, setExercise] = useState('');
  const [loading, setLoading] = useState<'photo' | 'read' | 'reply' | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<Retry | null>(null);
  const busy = useRef(false);
  const photoGeneration = useRef(0);
  const alive = useRef(true);
  const { expression, react } = useCompanionReaction();
  const { speakingId, speechError, speak, stop } = useTutorSpeech(age, voice);
  useEffect(() => {
    let active = true;
    void loadVoiceChoice().then(choice => { if (active) setVoice(choice); });
    return () => { active = false; };
  }, []);
  const chooseVoice = (choice: VoiceChoice) => { setVoice(choice); void saveVoiceChoice(choice); };
  const refreshConnection = useCallback(async () => {
    try {
      const next = await getTutorStatus();
      if (alive.current) { setStatus(next); setAccount(next.account ?? null); setConnectionError(''); }
    } catch {
      if (alive.current) { setStatus(null); setConnectionError('No pudimos comprobar la conexión.'); }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void getTutorStatus().then(next => {
      if (alive.current) { setStatus(next); setAccount(next.account ?? null); setConnectionError(''); }
    }).catch(() => {
      if (alive.current) setConnectionError('No pudimos comprobar la conexión.');
    });
    return () => { alive.current = false; if (speechTimer.current) clearTimeout(speechTimer.current); };
  }, []);

  const pickPhoto = async (camera: boolean, captured?: TaskPhoto) => {
    if (busy.current) return;
    busy.current = true;
    const currentPhoto = ++photoGeneration.current;
    setLoading('photo'); setError('');
    try {
      // On web launch directly from the click; waiting for permission breaks activation.
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('No se pudo abrir la cámara. Puedes usar «Subir foto» o habilitar el permiso en tu dispositivo.');
      }
      if (currentPhoto !== photoGeneration.current) return;
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false };
      const result = captured ? { canceled: false, assets: [captured] } : camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (currentPhoto !== photoGeneration.current || result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > 1800) context.resize(asset.width > asset.height ? { width: 1800 } : { height: 1800 });
      const rendered = await context.renderAsync();
      const prepared = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
      if (!prepared.base64 || prepared.base64.length > 2_450_000) throw new Error('La foto es muy grande. Toma otra más cerca de un solo ejercicio.');
      if (!alive.current || currentPhoto !== photoGeneration.current) return;
      setPhoto({ uri: prepared.uri, data: `data:image/jpeg;base64,${prepared.base64}` });
      setTranscript(null); setNeedsRetake(false); setRetry(null);
      react('focused');
    } catch (e) { if (alive.current && currentPhoto === photoGeneration.current) setError(e instanceof Error ? e.message : 'No se pudo preparar la foto. Inténtalo con otra imagen.'); }
    finally { if (currentPhoto === photoGeneration.current) { busy.current = false; if (alive.current) setLoading(null); } }
  };

  const readPhoto = async () => {
    if (busy.current || !photo) return;
    busy.current = true; setLoading('read'); setError(''); react('think');
    await stop().catch(() => {});
    try {
      const result = await askTutor({ ageBand: band, childName: '', action: 'read', provider, imageBase64: photo.data });
      if (!alive.current) return;
      if (typeof result.transcription !== 'string') throw new Error('No llegó la lectura de la tarea. Vuelve a intentarlo.');
      setTranscript(result.transcription); setNeedsRetake(Boolean(result.needsRetake));
      react(result.needsRetake ? 'confused' : 'explain');
    } catch (e) { if (alive.current) { setError(e instanceof Error ? e.message : 'No se pudo leer la foto.'); react('retry'); } }
    finally { busy.current = false; if (alive.current) setLoading(null); }
  };

  // The tutor steps back only after it has finished writing and speaking.
  const finishTurn = (generation: number) => {
    const current = turn.current;
    if (generation !== current.generation || !current.written || !current.spoken || !alive.current) return;
    setPhase('turn'); react('listen');
  };
  const markSpoken = (generation: number) => {
    if (generation !== turn.current.generation) return;
    turn.current.spoken = true;
    if (speechTimer.current) { clearTimeout(speechTimer.current); speechTimer.current = null; }
    finishTurn(generation);
  };
  useEffect(() => {
    let active = true;
    void loadHistory(childId).then(saved => { if (active) setHistory(saved); });
    void readCourseMemory(childId).then(saved => { if (active) setCourseMemory(saved); });
    return () => { active = false; };
  }, [childId]);
  const remember = (next: Page) => {
    if (!next.reply) return;
    setHistory(current => {
      const updated = addEntry(current, { id: next.key, at: new Date().toISOString(), childLine: next.childLine, lines: next.lines, reply: next.reply ?? '', visual: next.visual, images: next.images, photos: next.photos, summary: next.summary });
      void saveHistory(childId, updated);
      return updated;
    });
    setHistoryDay(dayKey());
  };
  const present = (next: Page) => {
    const generation = ++turn.current.generation;
    turn.current = { generation, written: false, spoken: !voiceOn || !next.reply };
    // A drawing step lasts about as long as eight written letters.
    const chars = Math.max(1, next.lines.join('').length + (next.visual ? (next.visual.type === 'map' ? next.visual.branches.length + 1 : next.visual.shapes.length) * 8 : 0));
    const speechMs = (next.reply ?? next.lines.join(' ')).split(/\s+/).length * (age <= 8 ? 480 : 400);
    setPace(Math.round(Math.min(110, Math.max(35, (speechMs * 0.6) / chars))));
    setPage(next); setPhase('writing'); react('explain');
    if (voiceOn && next.reply && next.replyId) {
      // Some browsers never report the end of an utterance; don't leave the child waiting.
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => markSpoken(generation), speechMs + 5000);
      void speak(next.replyId, next.reply, () => markSpoken(generation));
    }
  };
  const onWritten = useCallback(() => { turn.current.written = true; finishTurn(turn.current.generation); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (message = input, action: TutorAction = 'help', confirmedExercise = exercise, fresh = false, answer: Answer = {}) => {
    if (busy.current || (!message.trim() && !answer.handwriting)) return;
    busy.current = true; setLoading('reply'); setError(''); setRetry(null); react('think');
    turn.current.generation++;
    await stop().catch(() => {});
    const previousPage = page;
    const childLine = answer.childLine ?? (fresh ? 'Mi tarea' : message.trim());
    setPage({ key: uid(), lines: [], childLine }); setPhase('thinking');
    // Bring the board back into view so the child sees the tutor walk up and write.
    scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
    const previous = fresh ? messages.filter(m => m.id === 'welcome') : messages;
    try {
      const result = await askTutor({ ageBand: band, age, childName: '', message: message.trim(), handwriting: answer.handwriting, action, mode: openMode ? 'open' : 'tutor', provider, exercise: confirmedExercise, history: previous.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, text: m.text })),
        ...(course ? { courseTitle: course.title, memory: courseEntries(courseMemory, course.id).map(({ at, topic: t, summary }) => ({ at, topic: t, summary })), syllabus: syllabusOf(course) } : {}) });
      if (!alive.current) return;
      const heard = answer.handwriting ? result.heard?.trim() || '(no se pudo leer)' : '';
      const reply: Message = { id: uid(), role: 'tutor', text: result.reply, source: result.source };
      setMessages([...previous, { id: uid(), role: 'child', text: fresh ? `Mi tarea:\n${confirmedExercise}` : answer.handwriting ? `Escribí en la pizarra: ${heard}` : message.trim() }, reply]);
      setInput(''); setExercise(confirmedExercise);
      if (answer.handwriting) pad.current?.clear();
      if (fresh) { setPhoto(null); setTranscript(null); setNeedsRetake(false); }
      const next: Page = { key: reply.id, lines: result.board?.length ? result.board : [result.reply], childLine: answer.handwriting ? `✏️ ${heard}` : childLine, reply: result.reply, replyId: reply.id, source: result.source, visual: result.visual, images: result.images, photos: result.photos, summary: result.summary };
      if (result.account) setAccount(result.account);
      present(next); remember(next);
      if (course) rememberCourse(course.id, fresh ? confirmedExercise : previous.some(m => m.id !== 'welcome') ? '' : message.trim(), result.summary ?? [], result.reply);
      // The realistic picture comes after the reply; the board shows "drawing…" meanwhile.
      // It is not kept in the day's history, so the device doesn't fill up with images.
      if (result.picture && account) void paint(next.key, result.picture);
      if (action === 'hint') react('hint', 6000, 'explain');
      if (result.source === 'local') setStatus({ configured: false, providers: [], vision: false });
    } catch (e) {
      if (alive.current) { setError(e instanceof Error ? e.message : 'No se pudo recibir la respuesta.'); setRetry({ message, action, exercise: confirmedExercise, fresh, answer }); setPage(previousPage); setPhase('turn'); react('retry'); }
    } finally { busy.current = false; if (alive.current) setLoading(null); }
  };
  // The course remembers each topic the child worked on and the tutor's summary of it.
  const rememberCourse = (id: string, opening: string, summary: string[], reply: string) => {
    if (opening) topic.current = opening.split('\n')[0].replace(/^Quiero estudiar el tema:\s*/i, '').trim().slice(0, 120);
    if (!topic.current) return;
    setCourseMemory(current => {
      const known = current.find(m => m.courseId === id && m.topic.toLowerCase() === topic.current.toLowerCase());
      const updated = addMemory(current, { at: new Date().toISOString(), courseId: id, topic: topic.current, summary: summary.join(' ') || known?.summary || reply.slice(0, 160) });
      void saveCourseMemory(childId, updated);
      return updated;
    });
  };
  const chooseCourse = (id: string) => {
    if (id === courseId || busy.current) return;
    setCourseId(id); topic.current = '';
    setMessages(current => current.filter(m => m.id === 'welcome')); setExercise('');
  };
  const paint = async (key: string, picture: PictureRequest) => {
    const drawingLabel = picture.label || 'tu imagen';
    setPage(current => current.key === key ? { ...current, drawingLabel } : current);
    try {
      const { photo, account: nextAccount } = await generatePicture(picture);
      if (!alive.current) return;
      if (nextAccount) setAccount(nextAccount);
      setPage(current => current.key === key ? { ...current, drawingLabel: undefined, photos: [photo, ...(current.photos ?? [])] } : current);
    } catch (e) {
      if (!alive.current) return;
      setPage(current => current.key === key ? { ...current, drawingLabel: undefined } : current);
      setError(e instanceof Error ? e.message : 'No pude terminar la imagen.');
    }
  };
  const sendDrawing = async () => {
    const image = await pad.current?.toImage();
    if (!image) { setError('Escribe tu respuesta en la pizarra antes de enviarla.'); return; }
    await send('', 'help', exercise, false, { handwriting: image, childLine: '✏️ …' });
  };
  // A topic opened from study mode starts the lesson by itself, once the course is loaded.
  const opened = useRef(false);
  useEffect(() => {
    const wanted = typeof params.topic === 'string' ? params.topic.trim() : '';
    if (opened.current || !wanted || (courseId && !course)) return;
    opened.current = true;
    void send(`Quiero estudiar el tema: ${wanted.slice(0, 200)}`);
  }, [course]); // eslint-disable-line react-hooks/exhaustive-deps
  const listening = useSpeechInput(text => { setInput(text); void send(text); });
  const startListening = () => { void stop().catch(() => {}); listening.start(); react('listen'); };
  const hasExplanation = messages.some(m => m.source);
  const yourTurn = phase === 'turn' && !loading;
  const modeText = connectionError || (!status ? 'Comprobando conexión…' : status.configured ? `IA configurada · ${status.providers.map(id => labels[id]).join(' y ')}` : 'Modo práctica · IA y lectura de fotos pendientes de activar');
  const bubble = loading === 'reply' ? 'Mmm…' : loading === 'read' ? 'Leyendo…' : phase === 'turn' ? '¡Tu turno!' : undefined;
  const modes: { id: InputMode; label: string }[] = [{ id: 'pen', label: '✏️ Escribir' }, { id: 'keys', label: '⌨️ Teclado' }, ...(listening.supported ? [{ id: 'voice' as const, label: '🎤 Hablar' }] : [])];

  // Full screen gives phones a big, calm writing surface; on web it also hides the browser bars where allowed.
  const openFullscreen = () => {
    setFullscreen(true);
    if (Platform.OS === 'web' && typeof document !== 'undefined') void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const closeFullscreen = () => {
    listening.stop(); setFullscreen(false); setDrawing(false);
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
  const answerPad = (full: boolean) => <View style={styles.answerArea}>
    <HandwritingPad ref={pad} height={full ? Math.max(200, height - insets.top - insets.bottom - (wide ? 420 : 330)) : Math.max(wide ? 320 : 240, Math.round(height * 0.42))} color={penColor} enabled={yourTurn} initialStrokes={ink} placeholder={yourTurn ? 'Escribe aquí tu respuesta con el dedo o el lápiz ✏️' : 'Espera a que el tutor termine de escribir…'} onStrokesChange={setInk} onDrawingChange={setDrawing} />
    <View style={styles.toolRow}>
      {penColors.map(c => <Pressable key={c} accessibilityRole="button" accessibilityLabel="Cambiar color del rotulador" accessibilityState={{ selected: penColor === c }} onPress={() => setPenColor(c)} style={[styles.swatch, { backgroundColor: c }, penColor === c && styles.swatchOn]} />)}
      <Pressable accessibilityRole="button" onPress={() => pad.current?.undo()} disabled={!inked} style={[styles.tool, !inked && styles.dim]}><Text style={styles.toolText}>↩︎ Deshacer</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => pad.current?.clear()} disabled={!inked} style={[styles.tool, !inked && styles.dim]}><Text style={styles.toolText}>🧽 Borrar</Text></Pressable>
      {full && listening.supported ? <Pressable accessibilityRole="button" accessibilityLabel={listening.listening ? 'Dejar de escuchar' : 'Dictar tu respuesta con la voz'} disabled={Boolean(loading)} onPress={() => listening.listening ? listening.stop() : startListening()} style={[styles.tool, listening.listening && styles.micTool, Boolean(loading) && styles.dim]}><Text style={[styles.toolText, listening.listening && styles.sendText]}>{listening.listening ? '■ Parar' : '🎤 Dictar'}</Text></Pressable> : null}
      {!full ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir la pizarra en pantalla completa" onPress={openFullscreen} style={styles.tool}><Text style={styles.toolText}>⛶ Pantalla completa</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => void sendDrawing()} disabled={!inked || !yourTurn} style={[styles.tool, styles.sendTool, (!inked || !yourTurn) && styles.dim]}><Text style={[styles.toolText, styles.sendText]}>Enviar ✓</Text></Pressable>
    </View>
    {full && (listening.listening || listening.error) ? <Text accessibilityLiveRegion="polite" style={listening.error ? styles.error : styles.voiceText}>{listening.error || listening.interim || 'Te escucho…'}</Text> : null}
  </View>;
  // Re-show a saved board without voice or animation, so the child can review the day.
  const review = (entry: TutorHistory[string][number]) => {
    turn.current.generation++;
    void stop().catch(() => {});
    setPage({ key: `review-${entry.id}`, review: entry.id, lines: entry.lines, childLine: entry.childLine, reply: entry.reply, replyId: entry.id, visual: entry.visual, images: entry.images, photos: entry.photos, summary: entry.summary });
    setPhase('turn'); react('listen');
    scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
  };
  // Searches already shown as a taped photo don't need a link too.
  const extraImages = (page.images ?? []).filter(image => !page.photos?.some(photo => photo.query === image.query));
  const board = (full: boolean) => <TutorWhiteboard phase={phase} pageKey={page.key} lines={page.lines} childLine={page.childLine} visual={page.visual} photos={page.photos} drawingLabel={page.drawingLabel} summary={page.summary} pace={pace} expression={expression} bubble={bubble} width={full ? width : stageWidth} onWritten={onWritten}>
    {mode === 'pen' || full ? answerPad(full) : null}
  </TutorWhiteboard>;

  return (
    <Screen scroll fill scrollEnabled={!drawing} scrollRef={scroller}>
      <Modal visible={fullscreen} animationType="slide" onRequestClose={closeFullscreen} supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.fullRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={[styles.fullHeader, styles.fullHeaderPad]}>
            <Text style={styles.sectionTitle}>Pizarra</Text>
            <Pressable accessibilityRole="button" onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.tool}><Text style={styles.toolText}>{voiceOn ? '🔊' : '🔇'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Salir de pantalla completa" onPress={closeFullscreen} style={[styles.tool, styles.exitTool]}><Text style={styles.toolText}>✕ Salir</Text></Pressable>
          </View>
          {board(true)}
          {error ? <Text accessibilityRole="alert" style={[styles.error, styles.fullHeaderPad]}>{error}</Text> : null}
        </View>
      </Modal>
      <VoicePicker visible={voicesOpen} value={voice} onChange={chooseVoice} onPreview={choice => void speak(`sample-${Date.now()}`, VOICE_SAMPLE, undefined, choice)} onClose={() => setVoicesOpen(false)} />
      {cameraOpen ? <TaskCamera onClose={() => setCameraOpen(false)} onCapture={captured => void pickPhoto(false, captured)} /> : null}
      <Text style={styles.eyebrow}>APRENDEMOS A TU RITMO</Text>
      <Text style={styles.title}>La pizarra de tu tutor</Text>
      <View style={styles.edge} onLayout={e => { setStageWidth(e.nativeEvent.layout.width); stageY.current = e.nativeEvent.layout.y; }}>
        {fullscreen ? <Text style={styles.hint}>La pizarra está en pantalla completa.</Text> : board(false)}
      </View>
      <View style={styles.column}>

      {account?.openMode ? <View style={styles.modes} accessibilityRole="tablist">
        {([['tutor', '🎓 Tutor de tareas'], ['open', '💬 Modo libre']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tutorMode === id }} onPress={() => setTutorMode(id)} style={[styles.mode, tutorMode === id && styles.modeOn]}><Text style={[styles.modeText, tutorMode === id && styles.modeTextOn]}>{label}</Text></Pressable>)}
      </View> : null}
      {account ? <TutorUsageBar account={account} compact /> : null}
      {state.courses.length ? <View style={styles.courses}>
        <Text style={styles.courseLabel}>📚 ¿De qué curso es?</Text>
        <View style={styles.toolRow} accessibilityRole="tablist">
          {[{ id: '', title: 'General', color: colors.inkMuted }, ...state.courses].map(c => <Pressable key={c.id || 'general'} accessibilityRole="tab" accessibilityState={{ selected: courseId === c.id }} disabled={Boolean(loading)} onPress={() => chooseCourse(c.id)} style={[styles.mode, styles.courseChip, courseId === c.id && styles.modeOn]}>
            <View style={[styles.courseDot, { backgroundColor: c.color }]} />
            <Text style={[styles.modeText, courseId === c.id && styles.modeTextOn]}>{c.title}</Text>
          </Pressable>)}
        </View>
        {course ? <Text style={styles.hint}>{courseEntries(courseMemory, course.id).length ? `El tutor recuerda ${courseEntries(courseMemory, course.id, 30).length} ${courseEntries(courseMemory, course.id, 30).length === 1 ? 'tema' : 'temas'} de ${course.title} y explica a partir de ahí.` : `Lo que trabajes aquí se recordará para las próximas clases de ${course.title}.`}</Text> : null}
      </View> : null}
      <View style={styles.modes} accessibilityRole="tablist">
        {modes.map(m => <Pressable key={m.id} accessibilityRole="tab" accessibilityState={{ selected: mode === m.id }} onPress={() => { setMode(m.id); if (m.id !== 'voice') listening.stop(); }} style={[styles.mode, mode === m.id && styles.modeOn]}><Text style={[styles.modeText, mode === m.id && styles.modeTextOn]}>{m.label}</Text></Pressable>)}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceOn }} onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.mode}><Text style={styles.modeText}>{voiceOn ? '🔊 Voz' : '🔇 Sin voz'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Elegir la voz del tutor" onPress={() => setVoicesOpen(true)} style={styles.mode}><Text style={styles.modeText}>🗣️ Cambiar voz</Text></Pressable>
      </View>

      {mode === 'keys' ? <View style={styles.composer}>
        <TextInput accessibilityLabel="Tu respuesta o tu duda para el tutor" value={input} onFocus={() => { if (!loading) react('listen'); }} onChangeText={setInput} placeholder={listening.supported ? 'Escribe tu respuesta o tu duda…' : 'Escribe tu respuesta o tu duda… (o usa el micrófono del teclado 🎤)'} placeholderTextColor={colors.inkMuted} multiline maxLength={2000} editable={!loading} style={styles.input}
          submitBehavior="submit" onSubmitEditing={() => { if (!loading && input.trim()) void send(); }}
          onKeyPress={event => {
            // Web: Enter sends, Shift+Enter keeps a new line (native uses submitBehavior instead).
            const key = event as unknown as { key?: string; shiftKey?: boolean; nativeEvent: { isComposing?: boolean }; preventDefault?: () => void };
            if (Platform.OS !== 'web' || key.key !== 'Enter' || key.shiftKey || key.nativeEvent.isComposing) return;
            key.preventDefault?.();
            if (!loading && input.trim()) void send();
          }} />
        <PrimaryButton label="Enviar →" onPress={() => void send()} disabled={Boolean(loading) || !input.trim()} />
      </View> : null}
      {mode === 'voice' ? <View style={[styles.composer, styles.voiceBox]}>
        <Pressable accessibilityRole="button" accessibilityLabel={listening.listening ? 'Dejar de escuchar' : 'Hablar con el tutor'} disabled={Boolean(loading)} onPress={() => listening.listening ? listening.stop() : startListening()} style={[styles.mic, listening.listening && styles.micOn, Boolean(loading) && styles.dim]}><Text style={styles.micIcon}>{listening.listening ? '■' : '🎤'}</Text></Pressable>
        <Text style={styles.voiceText} accessibilityLiveRegion="polite">{listening.listening ? listening.interim || 'Te escucho…' : 'Toca el micrófono y dime tu respuesta o tu duda'}</Text>
        {listening.error ? <Text accessibilityRole="alert" style={styles.error}>{listening.error}</Text> : null}
      </View> : null}

      {page.reply ? <View style={styles.said}>
        <Text style={styles.saidText} selectable>{page.reply}</Text>
        <View style={styles.messageFooter}>
          <Pressable accessibilityRole="button" accessibilityLabel={speakingId === page.replyId ? 'Detener lectura' : 'Escuchar otra vez'} onPress={() => page.replyId && page.reply && void speak(page.replyId, page.reply)} style={styles.listen}><Text style={styles.link}>{speakingId === page.replyId ? '■ Detener' : '▶ Escuchar otra vez'}</Text></Pressable>
          {page.source ? <Text style={styles.source}>{labels[page.source]}</Text> : null}
        </View>
      </View> : null}
      {extraImages.length ? <View style={styles.said}>
        <Text style={styles.sectionTitle}>🖼️ {page.photos?.length ? 'Más imágenes' : 'Imágenes'} para mirar con un adulto</Text>
        <View style={styles.wrap}>
          {extraImages.map(image => <Pressable key={image.query} accessibilityRole="link" accessibilityLabel={`Buscar imágenes de ${image.query}`} onPress={() => void openBrowserAsync(imageSearchUrl(image.query))} style={styles.imageLink}>
            <Text style={styles.link}>🔎 {image.query}</Text>
            {image.label ? <Text style={styles.source}>{image.label}</Text> : null}
          </Pressable>)}
        </View>
        <Text style={styles.footnote}>Se abre Wikimedia Commons, un banco de imágenes libres.</Text>
      </View> : null}
      {speechError ? <Text accessibilityRole="alert" style={styles.error}>{speechError}</Text> : null}
      {loading === 'photo' || loading === 'read' ? <View style={styles.loading}><ActivityIndicator color={colors.coral} /><Text style={styles.hint}>{loading === 'photo' ? 'Preparando foto…' : 'Leyendo la escritura…'}</Text></View> : null}
      {loading === 'photo' ? <PrimaryButton label="Cancelar preparación de foto" variant="secondary" onPress={() => { photoGeneration.current++; busy.current = false; setLoading(null); }} /> : null}
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry ? <PrimaryButton label="Reintentar" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(retry.message, retry.action, retry.exercise, retry.fresh, retry.answer)} /> : null}</View> : null}

      {hasExplanation && !photo ? <View style={styles.wrap}>
        {(['continue', 'simpler', 'example', 'hint', 'more', 'map', 'draw', 'images', 'summary'] as const).map(id => <Pressable key={id} accessibilityRole="button" disabled={Boolean(loading)} onPress={() => void send(actionMessages[id], id, exercise, false, { childLine: actionLines[id] })} style={[styles.chip, id === 'continue' && styles.chipMain, Boolean(loading) && styles.dim]}><Text style={[styles.chipText, id === 'continue' && styles.sendText]}>{actionButtons[id]}</Text></Pressable>)}
      </View> : null}

      {photo ? <View style={styles.photoCard}>
        <Text style={styles.sectionTitle}>Vamos a leer tu tarea</Text>
        <Image source={{ uri: photo.uri }} style={styles.previewImg} resizeMode="contain" accessibilityLabel="Foto de la tarea pendiente de revisar" />
        <Text style={styles.hint}>Un ejercicio por foto, buena luz y letras enfocadas. La foto se envía a OpenAI o Anthropic al pulsar «Leer mi tarea».</Text>
        <View style={styles.wrap}>
          <PrimaryButton label={transcript === null ? 'Leer mi tarea' : 'Volver a leer la foto'} disabled={Boolean(loading)} onPress={() => void readPhoto()} style={styles.action} />
          <PrimaryButton label="Quitar foto" variant="secondary" disabled={Boolean(loading)} onPress={() => { setPhoto(null); setTranscript(null); setNeedsRetake(false); setError(''); setRetry(null); }} style={styles.action} />
        </View>
        {transcript !== null ? <View style={styles.transcript}>
          <Text style={styles.sectionTitle}>Esto es lo que pude leer</Text>
          <Text style={styles.hint}>{needsRetake ? 'No pude leerlo todo. Toma otra foto o completa el texto.' : 'Compáralo con tu hoja y corrige cualquier letra o número antes de empezar.'} Los símbolos [?] necesitan revisión.</Text>
          <TextInput accessibilityLabel="Texto reconocido de la tarea" value={transcript} onChangeText={value => { setTranscript(value); setNeedsRetake(false); }} multiline maxLength={4000} editable={!loading} style={[styles.input, styles.transcriptInput]} />
          <PrimaryButton label="El texto está bien · Empezar" disabled={Boolean(loading) || needsRetake || !transcript.trim() || transcript.includes('[?]')} onPress={() => void send('Ayúdame paso a paso con este ejercicio.', 'help', transcript.trim(), true)} />
        </View> : null}
      </View> : null}

      <View style={styles.composer}>
        <Text style={styles.sectionTitle}>📷 ¿Tienes la tarea en papel?</Text>
        <View style={styles.wrap}>
          <PrimaryButton label="Tomar foto" variant="secondary" onPress={() => { if (Platform.OS === 'web') setCameraOpen(true); else void pickPhoto(true); }} disabled={Boolean(loading)} style={styles.action} />
          <PrimaryButton label="Subir foto" variant="secondary" onPress={() => void pickPhoto(false)} disabled={Boolean(loading)} style={styles.action} />
        </View>
      </View>

      {Object.keys(history).length ? <View style={styles.composer}>
        <Text style={styles.sectionTitle}>📅 Lo que aprendimos</Text>
        <View style={styles.toolRow}>
          {Object.keys(history).sort().reverse().map(day => <Pressable key={day} accessibilityRole="tab" accessibilityState={{ selected: historyDay === day }} onPress={() => setHistoryDay(day)} style={[styles.mode, historyDay === day && styles.modeOn]}><Text style={[styles.modeText, historyDay === day && styles.modeTextOn]}>{dayLabel(day)} · {history[day].length}</Text></Pressable>)}
        </View>
        {(history[historyDay] ?? []).length ? [...(history[historyDay] ?? [])].reverse().map(entry => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Repasar: ${entry.lines[0] ?? entry.reply}`} disabled={Boolean(loading)} onPress={() => review(entry)} style={[styles.historyItem, page.review === entry.id && styles.historyItemOn]}>
          <Text style={styles.historyTime}>{new Date(entry.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
          <View style={styles.flex}>
            {entry.childLine ? <Text style={[styles.historyLine, styles.historyChild]} numberOfLines={1}>Tú: {entry.childLine}</Text> : null}
            <Text style={styles.historyLine} numberOfLines={2}>{entry.visual ? (entry.visual.type === 'map' ? '🗺️ ' : '✏️ ') : ''}{entry.lines.join(' · ')}</Text>
          </View>
        </Pressable>) : <Text style={styles.hint}>Este día todavía no hay pizarras.</Text>}
      </View> : null}

      <View style={styles.connection}>
        <Text style={styles.eyebrow}>PARA ADULTOS</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">{modeText}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refreshConnection()} disabled={Boolean(loading)}><Text style={styles.link}>Comprobar conexión</Text></Pressable>
        {status?.configured ? <View style={styles.wrap}>
          {(['auto', 'openai', 'anthropic'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Usar ${id === 'auto' ? 'conexión automática' : labels[id]}`} accessibilityState={{ selected: provider === id, disabled: id !== 'auto' && !status.providers.includes(id) }} disabled={Boolean(loading) || (id !== 'auto' && !status.providers.includes(id))} onPress={() => setProvider(id)} style={[styles.provider, provider === id && styles.providerSelected]}><Text style={styles.providerText}>{id === 'auto' ? 'Automático' : labels[id]}</Text></Pressable>)}
        </View> : null}
        <Text style={styles.footnote}>En la web, las voces naturales se generan con la IA (OpenAI) y cuentan en el límite mensual; las voces del dispositivo son gratis. El dictado usa el reconocimiento de voz del navegador. Lo que el niño escribe en la pizarra se envía como imagen a la IA solo al pulsar «Enviar». El historial de pizarras de los últimos 14 días se guarda solo en este dispositivo. Las fotos no se guardan en el perfil.</Text>
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, color: colors.inkMuted },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, marginTop: 6 },
  hint: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 5 },
  connection: { backgroundColor: colors.white, borderRadius: radii.md, padding: 14, gap: 9, marginVertical: spacing.md },
  status: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  link: { fontFamily: fonts.bodyBold, color: '#2C60AE', fontSize: 14 },
  provider: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#CDDCE9', borderRadius: 12, paddingHorizontal: 14 },
  providerSelected: { backgroundColor: colors.mist, borderColor: colors.sky },
  providerText: { fontFamily: fonts.bodyBold, color: colors.ink },
  answerArea: { gap: 10, marginTop: 4 },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: colors.white },
  swatchOn: { borderColor: colors.sun, transform: [{ scale: 1.12 }] },
  tool: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.mist },
  toolText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  sendTool: { backgroundColor: colors.coral, marginLeft: 'auto', paddingHorizontal: 20 },
  sendText: { color: colors.white },
  dim: { opacity: 0.45 },
  micTool: { backgroundColor: '#C93C22' },
  fullRoot: { flex: 1, backgroundColor: colors.mist },
  fullHeaderPad: { paddingHorizontal: 12 },
  edge: { marginHorizontal: -spacing.lg },
  column: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exitTool: { marginLeft: 'auto', backgroundColor: colors.white, borderWidth: 1, borderColor: '#CDDCE9' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  courses: { gap: 8 },
  courseLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  courseChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseDot: { width: 12, height: 12, borderRadius: 6 },
  mode: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#CDDCE9' },
  modeOn: { backgroundColor: '#2C60AE', borderColor: '#2C60AE' },
  modeText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  modeTextOn: { color: colors.white },
  voiceBox: { alignItems: 'center' },
  mic: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', shadowColor: colors.coral, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 },
  micOn: { backgroundColor: '#C93C22', transform: [{ scale: 1.08 }] },
  micIcon: { fontSize: 38, color: colors.white },
  voiceText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink, textAlign: 'center' },
  said: { backgroundColor: colors.white, borderRadius: 18, padding: 14, marginVertical: 6 },
  saidText: { fontFamily: fonts.body, color: colors.ink, fontSize: 16, lineHeight: 24 },
  messageFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 8 },
  listen: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.mist, borderRadius: 12 },
  source: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  errorBox: { backgroundColor: '#FFF1EC', padding: 16, borderRadius: 16, gap: 12, marginVertical: 12 },
  error: { fontFamily: fonts.bodySemi, color: '#9D3025', lineHeight: 23 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#CDDCE9', flexGrow: 1, alignItems: 'center' },
  chipMain: { backgroundColor: colors.leafDeep, borderColor: colors.leafDeep },
  chipText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 21, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 6 },
  action: { flexGrow: 1, flexBasis: 220 },
  photoCard: { backgroundColor: colors.white, padding: 18, borderRadius: 22, gap: 14, marginVertical: 12 },
  previewImg: { width: '100%', height: 230, borderRadius: 14, backgroundColor: colors.paper },
  transcript: { gap: 12, backgroundColor: colors.paper, borderRadius: 16, padding: 14 },
  transcriptInput: { minHeight: 150, textAlignVertical: 'top' },
  composer: { backgroundColor: colors.white, padding: 18, borderRadius: 22, gap: 14, marginVertical: 8 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: '#CEDDE9', borderRadius: radii.md, padding: 14, fontFamily: fonts.body, fontSize: 17, color: colors.ink, minHeight: 80, textAlignVertical: 'top' },
  historyItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 10, borderRadius: 14, backgroundColor: colors.paper },
  historyItemOn: { backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.sky },
  historyTime: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkMuted, paddingTop: 2 },
  flex: { flex: 1 },
  imageLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.mist, flexGrow: 1 },
  historyLine: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  historyChild: { color: '#2C60AE' },
  footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
});
