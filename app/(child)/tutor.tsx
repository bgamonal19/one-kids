import { editsExistingDrawing, explicitNewTopic, latestCourseBoard } from '@/lib/board-flow';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, ScrollView, Text, TextInput, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HandwritingPad, type HandwritingPadHandle, type Stroke } from '@/components/HandwritingPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskCamera, type TaskPhoto } from '@/components/TaskCamera';
import { loadTutorProvider } from '@/lib/tutor-preferences';
import { TutorWhiteboard, type BoardPhase } from '@/components/TutorWhiteboard';
import { STEP_COST } from '@/components/BoardSheet';
import { visualSteps } from '@/components/BoardVisual';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useTutorSpeech } from '@/hooks/useTutorSpeech';
import { VoicePicker } from '@/components/VoicePicker';
import { DEFAULT_VOICE, loadVoiceChoice, saveVoiceChoice, VOICE_SAMPLE, type VoiceChoice } from '@/lib/voices';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { askTutor, findReferenceImage, generatePicture, getTutorStatus, type TutorAccount, type BoardVisual, type ImageSearch, type PictureRequest, type TutorAction, type TutorProvider } from '@/lib/tutor';
import { dayKey, keepBoard, latestOfChain, loadBoards, newBoard, saveBoards, type Board, type BoardBlock } from '@/lib/tutor-boards';
import { BoardStrip } from '@/components/BoardStrip';
import type { CourseItem, TutorMessage } from '@/lib/types';
import { openBrowserAsync } from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addMemory, courseEntries, readCourseMemory, saveCourseMemory, type CourseMemory } from '@/lib/course-memory';

type Message = TutorMessage & { source?: 'openai' | 'anthropic' | 'local' | 'reference' };
type Photo = { uri: string; data: string };
type Answer = { handwriting?: string; childLine?: string };
type Retry = { message: string; action: TutorAction; exercise: string; fresh: boolean; answer: Answer };
/** The tutor's latest answer: what it said, and how long the writing should take. */
type Page = { key: string; lines: string[]; childLine?: string; reply?: string; replyId?: string; source?: Message['source']; visual?: BoardVisual | null; images?: ImageSearch[] };
type InputMode = 'pen' | 'keys' | 'voice';
const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const labels = { openai: 'OpenAI', anthropic: 'Claude · Anthropic', local: 'Práctica sin IA', reference: 'Referencia científica · IUPAC' };
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
  const params = useLocalSearchParams<{ course?: string; topic?: string }>();
  return <TutorSession key={`${params.course || 'general'}:${params.topic || ''}`} />;
}
function TutorSession() {
  const { state } = useFamily();
  const age = state.child?.age ?? 8;
  const band = getAgeBand(age);
  // Study mode links here with ?course=<id>&topic=<title>.
  const params = useLocalSearchParams<{ course?: string; topic?: string }>();
  const [courseId, setCourseId] = useState(typeof params.course === 'string' ? params.course : '');
  const course = state.courses.find(c => c.id === courseId);
  const [courseMemory, setCourseMemory] = useState<CourseMemory>([]);
  const topic = useRef('');
  // Parent settings and monthly usage; the open mode only shows when a parent enabled it.
  const [account, setAccount] = useState<TutorAccount | null>(null);
  // Only a parent turns the free mode on (Padres, with the PIN); the child cannot switch it.
  const openMode = Boolean(account?.openMode);

  const [provider, setProvider] = useState<TutorProvider>('auto');
  const greeting = `¡Hola${state.child?.name ? `, ${state.child.name}` : ''}!`;
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'tutor', text: `${greeting} Escribe, dibuja o dime tu duda, o añade una foto de tu tarea. Vamos a aprender un paso a la vez.` }]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stageWidth, setStageWidth] = useState(Math.min(width, 1100));
  const wide = stageWidth >= 700;
  const [phase, setPhase] = useState<BoardPhase>('writing');
  const [page, setPage] = useState<Page>({ key: 'welcome', lines: [] });
  // The board being written. A new topic gets a clean board; a full one continues on the next.
  const welcomeBoard = (): Board => ({ ...newBoard(''), id: `welcome-${Date.now()}`, blocks: [{ id: 'welcome', at: '', lines: [greeting, '¿Qué aprendemos hoy?'], reply: '' }] });
  const [board, setBoard] = useState<Board>(welcomeBoard);
  const [activeId, setActiveId] = useState('welcome');
  const [thinkingLine, setThinkingLine] = useState<string>();
  const [boards, setBoards] = useState<Board[]>([]);
  const [viewing, setViewing] = useState<Board | null>(null);
  const retired = useRef<Board[]>([]);
  // The board that comes after the eraser: the rest of a long answer, or a new topic.
  const [nextBoard, setNextBoard] = useState<Board | null>(null);
  const nextRef = useRef<Board | null>(null);
  useEffect(() => { nextRef.current = nextBoard; }, [nextBoard]);
  const [erasing, setErasing] = useState(false);
  const [wipingBoard, setWipingBoard] = useState<Board | null>(null);
  const boardRef = useRef(board);
  useEffect(() => { boardRef.current = board; }, [board]);
  const resumeLater = useRef<(saved: Board, all: Board[]) => void>(() => {});
  const [pace, setPace] = useState(70);
  const [mode, setMode] = useState<InputMode>('keys');
  const [penColor, setPenColor] = useState<string>(penColors[0]);
  const [ink, setInk] = useState<Stroke[]>([]);
  const inked = ink.length > 0;
  const [fullscreen, setFullscreen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voice, setVoice] = useState<VoiceChoice>(DEFAULT_VOICE);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const childId = state.child?.id ?? 'demo';
  const pad = useRef<HandwritingPadHandle>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  const stageY = useRef(0);
  const turn = useRef({ generation: 0, written: false, spoken: true });
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [input, setInput] = useState('');
  const [editTargetId, setEditTargetId] = useState<string>();
  const [referenceOption, setReferenceOption] = useState<{key: string; title: string; context: string} | null>(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceNote, setReferenceNote] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const editingBusy = useRef(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [needsRetake, setNeedsRetake] = useState(false);
  const [exercise, setExercise] = useState('');
  const [loading, setLoading] = useState<'photo' | 'read' | 'reply' | null>(null);
  const working = Boolean(loading) || erasing;
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
  const familyId = state.parent?.id || 'demo';
  const refreshConnection = useCallback(async () => {
    try {
      const [next, preferred] = await Promise.all([getTutorStatus(), loadTutorProvider(familyId)]);
      if (alive.current) { setAccount(next.account ?? null); setProvider(preferred === 'auto' || next.providers.includes(preferred) ? preferred : 'auto'); }
    } catch {
      if (alive.current) setAccount(null);
    }
  }, [familyId]);
  useFocusEffect(useCallback(() => { void refreshConnection(); }, [refreshConnection]));
  useEffect(() => {
    alive.current = true;
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
    void loadBoards(childId).then(saved => {
      if (!active) return;
      setBoards(current => current.length ? current : saved);
      // Coming back to the tutor the same day picks up the last board where it was left.
      const last = latestCourseBoard(saved, typeof params.course === 'string' ? params.course : '');
      if (last && dayKey(new Date(last.at)) === dayKey() && !params.topic && !boardRef.current.blocks.some(b => b.reply)) resumeLater.current(last, saved);
    });
    void readCourseMemory(childId).then(saved => { if (active) setCourseMemory(saved); });
    return () => { active = false; };
  }, [childId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Every board is kept on this device so the child can look back at the day's boards.
  useEffect(() => {
    const done = retired.current.splice(0);
    if (!done.length && !board.blocks.some(b => b.reply)) return;
    setBoards(current => {
      const updated = [...done, board].reduce(keepBoard, current);
      void saveBoards(childId, updated);
      return updated;
    });
  }, [board, childId]);
  // The shared surface grows with the conversation; only an intentional new topic wipes it.
  const place = (id: string, heights: number[]) => {
    const current = boardRef.current;
    const blocks = current.blocks.map(block => block.id === id && !block.segments ? { ...block, segments: [{ col: 0, from: block.start ?? 0, height: heights[0] ?? 0 }] } : block);
    const next = { ...current, blocks };
    boardRef.current = next; setBoard(next);
  };
  // After the eraser the full board is kept in «Mis pizarras» and the clean one takes its place.
  const erased = () => {
    if (boardRef.current.blocks.some(b => b.reply) && !retired.current.some(b => b.id === boardRef.current.id)) retired.current.push(boardRef.current);
    const clean = nextRef.current;
    if (clean) { setBoard(clean); if (!clean.blocks.length) setActiveId(''); }
    pad.current?.clear();
    nextRef.current = null; setNextBoard(null); setErasing(false); setWipingBoard(null);
  };
  // Wipe the board with the eraser before writing on a clean one.
  const changeBoard = (next: Board, forceErase = false) => {
    if (!forceErase && !boardRef.current.blocks.some(b => b.reply)) { setBoard(next); return; }
    setWipingBoard(viewing ?? boardRef.current);
    nextRef.current = next; setNextBoard(next); setErasing(true);
  };
  // Continue an earlier board: the tutor gets back that conversation and writes after its last part.
  const resume = (saved: Board, all: Board[] = boards) => {
    const target = latestOfChain(all, saved);
    const chain = all.filter(b => (b.chain ?? b.id) === (target.chain ?? target.id)).sort((a, b) => a.part - b.part);
    const seen = new Set<string>();
    const blocks = chain.flatMap(b => b.blocks).filter(b => b.reply && !seen.has(b.id) && seen.add(b.id));
    turn.current.generation++;
    void stop().catch(() => {});
    setBoard(target); setActiveId(''); setViewing(null); nextRef.current = null; setNextBoard(null); setErasing(false); setWipingBoard(null);
    setMessages(current => [...current.filter(m => m.id === 'welcome'), ...blocks.flatMap(b => [
      ...(b.childLine ? [{ id: `${b.id}-child`, role: 'child' as const, text: b.childLine }] : []),
      { id: b.id, role: 'tutor' as const, text: b.reply },
    ])]);
    setExercise(''); topic.current = target.topic; setCourseId(target.courseId ?? '');
    setPhase('turn'); react('listen');
  };
  useEffect(() => { resumeLater.current = resume; });
  const updateBlock = (id: string, change: (block: BoardBlock) => BoardBlock) => {
    const apply = (current: Board) => current.blocks.some(b => b.id === id) ? { ...current, blocks: current.blocks.map(b => b.id === id ? change(b) : b) } : current;
    setBoard(apply);
    setNextBoard(current => current && apply(current));
    retired.current = retired.current.map(apply);
    setBoards(current => {
      if (!current.some(saved => saved.blocks.some(b => b.id === id))) return current;
      const updated = current.map(apply); void saveBoards(childId, updated); return updated;
    });
  };
  const freshBoard = () => {
    if (busy.current || erasing) return;
    turn.current.generation++;
    void stop().catch(() => {});
    listening.stop();
    setReferenceOption(null); setReferenceNote('');
    changeBoard(newBoard('', [], course?.id), true); setViewing(null); setPage({ key: 'welcome', lines: [] });
    setMessages(current => current.filter(m => m.id === 'welcome')); setExercise(''); topic.current = '';
    setEditTargetId(undefined); setInput(''); setError(''); setRetry(null); setPhoto(null); setTranscript(null); setNeedsRetake(false);
    scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
    setPhase('turn'); react('listen');
  };
  const present = (next: Page) => {
    const generation = ++turn.current.generation;
    turn.current = { generation, written: false, spoken: !voiceOn || !next.reply };
    // Tracing one shape lasts about as long as writing STEP_COST letters.
    const chars = Math.max(1, next.lines.join('').length + (next.visual ? visualSteps(next.visual) * STEP_COST : 0));
    const speechMs = (next.reply ?? next.lines.join(' ')).split(/\s+/).length * (age <= 8 ? 480 : 400);
    // A drawing takes about twelve seconds to trace whatever its size: small ones slower, detailed ones faster.
    const drawPace = next.visual ? Math.min(45, Math.max(18, 12000 / (visualSteps(next.visual) * STEP_COST))) : 0;
    setPace(Math.round(Math.min(110, Math.max(drawPace || 35, (speechMs * 0.6) / chars))));
    setPage(next); setActiveId(next.key); setPhase('writing'); react('explain');
    if (voiceOn && next.reply && next.replyId) {
      // Some browsers never report the end of an utterance; don't leave the child waiting.
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => markSpoken(generation), speechMs + 5000);
      void speak(next.replyId, next.reply, () => markSpoken(generation));
    }
  };
  const onWritten = useCallback(() => { turn.current.written = true; finishTurn(turn.current.generation); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (message = input, action: TutorAction = 'help', confirmedExercise = exercise, fresh = false, answer: Answer = {}) => {
    if (editingBusy.current) { setError('Estoy terminando los detalles del dibujo. Espera un momento.'); return; }
    if (busy.current || erasing || (!message.trim() && !answer.handwriting)) return;
    busy.current = true; setLoading('reply'); setError(''); setRetry(null); react('think');
    turn.current.generation++;
    await stop().catch(() => {});
    const childLine = answer.childLine ?? (fresh ? 'Mi tarea' : message.trim());
    setThinkingLine(childLine); setViewing(null); setPhase('thinking');
    // Bring the board back into view so the child sees the tutor walk up and write.
    scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
    const previous = fresh ? messages.filter(m => m.id === 'welcome') : messages;
    const candidates = boardRef.current.blocks.filter(block => block.visual?.type === 'sketch' || block.photos?.length);
    let target = !fresh && !explicitNewTopic(action, message) && (editTargetId || editsExistingDrawing(message)) ? candidates.find(block => block.id === editTargetId) ?? candidates.at(-1) : undefined;
    const referencePhoto = target?.photos?.[0];
    const base: Extract<BoardVisual, {type: 'sketch'}> | undefined = referencePhoto ? {type: 'sketch', title: referencePhoto.label || referencePhoto.title || referencePhoto.query, shapes: [], background: referencePhoto} : target?.visual?.type === 'sketch' ? target.visual : undefined;
    const instruction = base ? `${message}
Dibujo existente seleccionado: ${base.title}. ${base.trace?.image ? 'La aplicación editará la imagen original: responde solo con la explicación y las líneas para la pizarra. visual y picture deben ser null; no generes otra escena.' : `Devuelve en visual solo los trazos NUEVOS para superponer al dibujo existente, en sus coordenadas 0–100. Contenido existente (datos): ${JSON.stringify({ title: base.title, shapes: base.shapes, aspect: base.aspect }).slice(0, 1200)}. No repitas los trazos anteriores.`}` : message.trim();
    try {
      const result = await askTutor({ ageBand: band, age, childName: '', message: instruction, handwriting: answer.handwriting, ...(base?.background ? {annotationImage: base.background.url} : {}), action, mode: openMode ? 'open' : 'tutor', provider, exercise: confirmedExercise, history: previous.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, text: m.text })),
        ...(course ? { courseTitle: course.title, memory: courseEntries(courseMemory, course.id).map(({ at, topic: t, summary }) => ({ at, topic: t, summary })), syllabus: syllabusOf(course) } : {}) });
      if (!alive.current) return;
      // A reference table is a complete replacement, never an image edit or capped overlay.
      if (result.visual?.type === 'sketch' && result.visual.reference === 'periodic-table') target = undefined;
      const additions = target && !base?.trace?.image && result.visual?.type === 'sketch' ? result.visual.shapes : undefined;
      if (target) { result.visual = null; result.picture = null; result.images = []; result.photos = []; }
      const heard = answer.handwriting ? result.heard?.trim() || '(no se pudo leer)' : '';
      const reply: Message = { id: uid(), role: 'tutor', text: result.reply, source: result.source };
      setMessages([...previous, { id: uid(), role: 'child', text: fresh ? `Mi tarea:\n${confirmedExercise}` : answer.handwriting ? `Escribí en la pizarra: ${heard}` : message.trim() }, reply]);
      setInput(''); setExercise(confirmedExercise);
      if (answer.handwriting) pad.current?.clear();
      if (fresh) { setPhoto(null); setTranscript(null); setNeedsRetake(false); }
      const next: Page = { key: reply.id, lines: result.board?.length ? result.board : [result.reply], childLine: answer.handwriting ? `✏️ ${heard}` : childLine, reply: result.reply, replyId: reply.id, source: result.source, visual: result.visual, images: result.images };
      if (result.account) setAccount(result.account);
      const block: BoardBlock = { id: reply.id, at: new Date().toISOString(), childLine: next.childLine, lines: next.lines, reply: result.reply, visual: result.visual, images: result.images, photos: result.photos, summary: result.summary };
      const title = (result.topic || (fresh ? confirmedExercise : message).split('\n')[0]).trim().slice(0, 50);
      // A new topic gets a clean board, wiped with the eraser; the same topic keeps writing where it was.
      const current = boardRef.current;
      // The board is full and waiting for the eraser: the new answer goes after the rest on the clean board.
      if (nextRef.current && !fresh && !result.newTopic) { const pending = { ...nextRef.current, blocks: [...nextRef.current.blocks, block] }; nextRef.current = pending; setNextBoard(pending); setErasing(true); }
      else if (!current.blocks.some(b => b.reply)) setBoard(newBoard(title, [block], course?.id));
      else if (fresh || explicitNewTopic(action, message)) changeBoard(newBoard(title, [block], course?.id));
      else setBoard({ ...current, topic: current.topic || title, blocks: [...current.blocks, block] });
      present(next);
      if (target && base?.trace?.image) void extendDrawing(target.id, base.title, message, base.trace.image);
      else if (target && additions?.length && base) updateBlock(target.id, block => ({ ...block, photos: referencePhoto ? (block.photos ?? []).filter(p => p.url !== referencePhoto.url) : block.photos, visual: { ...base, shapes: [...base.shapes, ...additions].slice(0, 160) } }));
      setEditTargetId(undefined);
      if (course) rememberCourse(course.id, fresh ? confirmedExercise : previous.some(m => m.id !== 'welcome') ? '' : message.trim(), result.summary ?? [], result.reply);
      // The realistic picture comes after the reply; the board shows "drawing…" meanwhile.
      // It is not kept in the day's history, so the device doesn't fill up with images.
      if (result.picture && account) void paint(next.key, result.picture);
      if (result.visual?.type === 'sketch' && result.visual.illustration) void illustrate(next.key, result.visual.title, result.visual.illustration);
      if (action === 'hint') react('hint', 6000, 'explain');
    } catch (e) {
      if (alive.current) { setError(e instanceof Error ? e.message : 'No se pudo recibir la respuesta.'); setRetry({ message, action, exercise: confirmedExercise, fresh, answer }); setPhase('turn'); react('retry'); }
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
  const paint = async (key: string, picture: PictureRequest) => {
    const drawingLabel = picture.label || 'tu imagen';
    updateBlock(key, block => ({ ...block, drawingLabel }));
    try {
      const { photo, account: nextAccount } = await generatePicture(picture);
      if (!alive.current) return;
      if (nextAccount) setAccount(nextAccount);
      updateBlock(key, block => ({ ...block, drawingLabel: undefined, photos: [photo, ...(block.photos ?? [])] }));
    } catch (e) {
      if (!alive.current) return;
      updateBlock(key, block => ({ ...block, drawingLabel: undefined }));
      setError(e instanceof Error ? e.message : 'No pude terminar la imagen.');
    }
  };
  // Whiteboard animation: the AI line drawing arrives a few seconds after the reply and the pencil traces it.
  const illustrate = async (key: string, title: string, prompt: string) => {
    setReferenceOption({key,title,context:prompt}); setReferenceNote('');
    const done = (change: (visual: Extract<NonNullable<BoardBlock['visual']>, { type: 'sketch' }>) => NonNullable<BoardBlock['visual']>) =>
      updateBlock(key, block => block.visual?.type === 'sketch' && block.visual.illustration === prompt ? { ...block, visual: change(block.visual) } : block);
    try {
      const { trace, account: nextAccount } = await generatePicture({ prompt, label: title, style: 'line' });
      if (!alive.current) return;
      if (nextAccount) setAccount(nextAccount);
      done(({ illustration: _i, ...visual }) => trace ? { ...visual, shapes: [], trace } : visual);
    } catch (e) {
      if (!alive.current) return;
      done(({ illustration: _i, ...visual }) => visual);
      setError(e instanceof Error ? e.message : 'No pude terminar el dibujo.');
    }
  };
  const referenceBlock = [...board.blocks].reverse().find(b => b.visual?.type === 'sketch' && !b.visual.reference);
  const offeredReference = referenceOption ?? (referenceBlock?.visual ? { key: referenceBlock.id, title: referenceBlock.visual.title, context: `${referenceBlock.childLine ?? ''}. ${referenceBlock.reply}` } : null);
  const searchReference = async () => {
    if (!offeredReference || referenceBusy) return;
    setReferenceBusy(true); setReferenceNote('Buscando una imagen del tema y comprobando su contenido…');
    try {
      const {photo, account: nextAccount} = await findReferenceImage(offeredReference.title, offeredReference.context);
      if (!alive.current) return;
      if (nextAccount) setAccount(nextAccount);
      if (!photo) { setReferenceNote('No encontré una imagen que pueda confirmar para este tema. Puedes precisar el nombre o continuar con la explicación.'); return; }
      updateBlock(offeredReference.key, block => ({...block, photos: [...(block.photos ?? []).filter(p => p.url !== photo.url), photo]}));
      setReferenceNote('Imagen comprobada con el tema. Tócala para ampliarla y consultar la fuente.');
    } catch (e) { if (alive.current) setReferenceNote(e instanceof Error ? e.message : 'No se pudo comprobar la imagen.'); }
    finally { if (alive.current) setReferenceBusy(false); }
  };
  const extendDrawing = async (id: string, title: string, prompt: string, baseImage: string) => {
    editingBusy.current = true; setEditingId(id); setError('');
    try {
      const { trace, account: nextAccount } = await generatePicture({ prompt, label: title, style: 'line', baseImage });
      if (!alive.current) return;
      if (!trace?.image) throw new Error('No pude añadir los detalles. El dibujo anterior se conserva.');
      if (nextAccount) setAccount(nextAccount);
      updateBlock(id, block => block.visual?.type === 'sketch' ? { ...block, visual: { ...block.visual, shapes: [], trace: { ...trace, beforeImage: baseImage } } } : block);
      scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'No pude añadir los detalles. Tu dibujo sigue guardado.'); }
    finally { editingBusy.current = false; if (alive.current) setEditingId(undefined); }
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
  const bubble = erasing ? '🧽 Borrando…' : loading === 'reply' ? 'Mmm…' : loading === 'read' ? 'Leyendo…' : phase === 'turn' ? '¡Tu turno!' : undefined;
  const modes: { id: InputMode; label: string }[] = [{ id: 'keys', label: '⌨️ Teclado' }, { id: 'pen', label: '✏️ Escribir' }, ...(listening.supported ? [{ id: 'voice' as const, label: '🎤 Hablar' }] : [])];

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
      {full && listening.supported ? <Pressable accessibilityRole="button" accessibilityLabel={listening.listening ? 'Dejar de escuchar' : 'Dictar tu respuesta con la voz'} disabled={working} onPress={() => listening.listening ? listening.stop() : startListening()} style={[styles.tool, listening.listening && styles.micTool, working && styles.dim]}><Text style={[styles.toolText, listening.listening && styles.sendText]}>{listening.listening ? '■ Parar' : '🎤 Dictar'}</Text></Pressable> : null}
      {!full ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir la pizarra en pantalla completa" onPress={openFullscreen} style={styles.tool}><Text style={styles.toolText}>⛶ Pantalla completa</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => void sendDrawing()} disabled={!inked || !yourTurn} style={[styles.tool, styles.sendTool, (!inked || !yourTurn) && styles.dim]}><Text style={[styles.toolText, styles.sendText]}>Enviar ✓</Text></Pressable>
    </View>
    {full && (listening.listening || listening.error) ? <Text accessibilityLiveRegion="polite" style={listening.error ? styles.error : styles.voiceText}>{listening.error || listening.interim || 'Te escucho…'}</Text> : null}
  </View>;
  // Re-show a saved board without voice or animation, so the child can review the day.
  const review = (saved: Board) => {
    if (busy.current || erasing) return;
    if (saved.id === board.id) { setViewing(null); return; }
    turn.current.generation++;
    void stop().catch(() => {});
    setViewing(saved); setPhase('turn'); react('listen');
    scroller.current?.scrollTo({ y: Math.max(0, stageY.current - 12), animated: true });
  };
  // Searches already shown as a taped photo don't need a link too.
  const saidPhotos = board.blocks.find(b => b.id === page.key)?.photos;
  const extraImages = (page.images ?? []).filter(image => !saidPhotos?.some(photo => photo.query === image.query));
  const reviewBanner = viewing ? <View style={styles.reviewBanner}>
    <Text style={styles.reviewText}>👀 Repasando una pizarra de las {new Date(viewing.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
    <View style={[styles.wrap, styles.reviewActions]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Seguir aprendiendo en esta pizarra" disabled={working} onPress={() => resume(viewing)} style={[styles.tool, styles.sendTool]}><Text style={[styles.toolText, styles.sendText]}>✏️ Seguir en esta pizarra</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setViewing(null)} style={styles.tool}><Text style={styles.toolText}>← Volver a mi pizarra</Text></Pressable>
    </View>
  </View> : null;
  const renderBoard = (full: boolean) => viewing && !erasing
    ? <TutorWhiteboard readOnly phase="turn" board={viewing} pace={pace} expression={expression} width={full ? width : stageWidth} onWritten={() => {}} banner={reviewBanner} />
    : <TutorWhiteboard phase={erasing ? 'turn' : phase} board={erasing ? wipingBoard ?? board : board} activeId={activeId} childLine={thinkingLine} pace={pace} expression={expression} bubble={bubble} width={full ? width : stageWidth} onPlace={erasing ? undefined : place} onWritten={onWritten} onEdit={erasing ? undefined : id => { setEditTargetId(id); setMode('keys'); setError(''); }}
      onBoardFull={() => setErasing(true)} erasing={erasing} onErased={erased}>
      {mode === 'pen' || full ? answerPad(full) : null}
    </TutorWhiteboard>;

  const newBoardButton = <Pressable accessibilityRole="button" accessibilityLabel="Crear una nueva pizarra" disabled={working} onPress={freshBoard} style={[styles.newBoardButton, working && styles.dim]}><Text style={styles.newBoardText}>＋ Nueva pizarra</Text></Pressable>;
  return (
    <Screen scroll fill scrollEnabled={!drawing} scrollRef={scroller} toolbar={newBoardButton}>
      <Modal visible={fullscreen} animationType="slide" onRequestClose={closeFullscreen} supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.fullRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={[styles.fullHeader, styles.fullHeaderPad]}>
            <Text style={styles.sectionTitle}>Pizarra</Text>
            {newBoardButton}
            <Pressable accessibilityRole="button" onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.tool}><Text style={styles.toolText}>{voiceOn ? '🔊' : '🔇'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Salir de pantalla completa" onPress={closeFullscreen} style={[styles.tool, styles.exitTool]}><Text style={styles.toolText}>✕ Salir</Text></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} scrollEnabled={!drawing} keyboardShouldPersistTaps="handled">{renderBoard(true)}</ScrollView>
          {error ? <Text accessibilityRole="alert" style={[styles.error, styles.fullHeaderPad]}>{error}</Text> : null}
        </View>
      </Modal>
      <VoicePicker visible={voicesOpen} value={voice} onChange={chooseVoice} onPreview={choice => void speak(`sample-${Date.now()}`, VOICE_SAMPLE, undefined, choice)} onClose={() => setVoicesOpen(false)} />
      {cameraOpen ? <TaskCamera onClose={() => setCameraOpen(false)} onCapture={captured => void pickPhoto(false, captured)} /> : null}
      <Text style={styles.eyebrow}>APRENDEMOS A TU RITMO</Text>
      <Text style={styles.title}>La pizarra de tu tutor</Text>
      <BoardStrip boards={boards} wide={stageWidth >= 700} openId={viewing?.id} currentId={board.id} onOpen={review} />
      <View style={styles.edge} onLayout={e => { setStageWidth(e.nativeEvent.layout.width); stageY.current = e.nativeEvent.layout.y; }}>
        {fullscreen ? <Text style={styles.hint}>La pizarra está en pantalla completa.</Text> : renderBoard(false)}
      </View>
      <View style={styles.column}>

      {offeredReference ? <View style={styles.reviewBanner}>
        <Text style={styles.hint}>¿Prefieres una imagen de internet para «{offeredReference.title}»? Puede ayudar si el dibujo es complejo.</Text>
        <Pressable accessibilityRole="button" disabled={referenceBusy || erasing} onPress={() => void searchReference()} style={styles.tool}><Text style={styles.toolText}>{referenceBusy ? 'Comprobando imagen…' : '🌐 Buscar imagen del tema en internet'}</Text></Pressable>
        {referenceNote ? <Text accessibilityLiveRegion="polite" style={styles.hint}>{referenceNote}</Text> : null}
      </View> : null}
      {editingId ? <Text accessibilityRole="status" style={styles.hint}>✏️ Añadiendo detalles al dibujo original…</Text> : null}
      {editTargetId ? <View style={styles.toolRow}><Text style={styles.hint}>✏️ Vas a ampliar: {board.blocks.find(b => b.id === editTargetId)?.photos?.[0]?.label || board.blocks.find(b => b.id === editTargetId)?.visual?.title || 'la imagen seleccionada'}. Escribe qué quieres añadir.</Text><Pressable accessibilityRole="button" onPress={() => setEditTargetId(undefined)}><Text style={styles.link}>Cancelar</Text></Pressable></View> : null}
      <View style={styles.modes} accessibilityRole="tablist">
        {modes.map(m => <Pressable key={m.id} accessibilityRole="tab" accessibilityState={{ selected: mode === m.id }} disabled={erasing} onPress={() => { setMode(m.id); if (m.id !== 'voice') listening.stop(); }} style={[styles.mode, mode === m.id && styles.modeOn]}><Text style={[styles.modeText, mode === m.id && styles.modeTextOn]}>{m.label}</Text></Pressable>)}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceOn }} onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.mode}><Text style={styles.modeText}>{voiceOn ? '🔊 Voz' : '🔇 Sin voz'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Elegir la voz del tutor" onPress={() => setVoicesOpen(true)} style={styles.mode}><Text style={styles.modeText}>🗣️ Cambiar voz</Text></Pressable>
      </View>

      <View style={styles.questionRow}>
      {mode === 'keys' ? <View style={[styles.composer, styles.questionComposer]}>
        <TextInput accessibilityLabel="Tu respuesta o tu duda para el tutor" value={input} onFocus={() => { if (!loading) react('listen'); }} onChangeText={setInput} placeholder={listening.supported ? 'Escribe tu respuesta o tu duda…' : 'Escribe tu respuesta o tu duda… (o usa el micrófono del teclado 🎤)'} placeholderTextColor={colors.inkMuted} multiline maxLength={2000} editable={!working} style={styles.input}
          submitBehavior="submit" onSubmitEditing={() => { if (!loading && input.trim()) void send(); }}
          onKeyPress={event => {
            // Web: Enter sends, Shift+Enter keeps a new line (native uses submitBehavior instead).
            const key = event as unknown as { key?: string; shiftKey?: boolean; nativeEvent: { isComposing?: boolean }; preventDefault?: () => void };
            if (Platform.OS !== 'web' || key.key !== 'Enter' || key.shiftKey || key.nativeEvent.isComposing) return;
            key.preventDefault?.();
            if (!loading && input.trim()) void send();
          }} />
        <PrimaryButton label="Enviar →" onPress={() => void send()} disabled={working || !input.trim()} />
      </View> : null}
      {mode === 'voice' ? <View style={[styles.composer, styles.voiceBox, styles.questionComposer]}>
        <Pressable accessibilityRole="button" accessibilityLabel={listening.listening ? 'Dejar de escuchar' : 'Hablar con el tutor'} disabled={working} onPress={() => listening.listening ? listening.stop() : startListening()} style={[styles.mic, listening.listening && styles.micOn, working && styles.dim]}><Text style={styles.micIcon}>{listening.listening ? '■' : '🎤'}</Text></Pressable>
        <Text style={styles.voiceText} accessibilityLiveRegion="polite">{listening.listening ? listening.interim || 'Te escucho…' : 'Toca el micrófono y dime tu respuesta o tu duda'}</Text>
        {listening.error ? <Text accessibilityRole="alert" style={styles.error}>{listening.error}</Text> : null}
      </View> : null}

      <View style={styles.photoTools}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tomar foto de la tarea" disabled={working} onPress={() => { if (Platform.OS === 'web') setCameraOpen(true); else void pickPhoto(true); }} style={styles.photoIcon}><Text style={styles.photoIconText}>📷</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Subir foto de la tarea" disabled={working} onPress={() => void pickPhoto(false)} style={styles.photoIcon}><Text style={styles.photoIconText}>🖼️</Text></Pressable>
      </View>
      </View>
      {page.reply ? <View style={styles.said}>
        <Text style={styles.saidText} selectable>{page.reply}</Text>
        <View style={styles.messageFooter}>
          <Pressable accessibilityRole="button" accessibilityLabel={speakingId === page.replyId ? 'Detener lectura' : 'Escuchar otra vez'} onPress={() => page.replyId && page.reply && void speak(page.replyId, page.reply)} style={styles.listen}><Text style={styles.link}>{speakingId === page.replyId ? '■ Detener' : '▶ Escuchar otra vez'}</Text></Pressable>
          {page.source ? <Text style={styles.source}>{labels[page.source]}</Text> : null}
        </View>
      </View> : null}
      {extraImages.length ? <View style={styles.said}>
        <Text style={styles.sectionTitle}>🖼️ {saidPhotos?.length ? 'Más imágenes' : 'Imágenes'} para mirar con un adulto</Text>
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
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry ? <PrimaryButton label="Reintentar" variant="secondary" disabled={working} onPress={() => void send(retry.message, retry.action, retry.exercise, retry.fresh, retry.answer)} /> : null}</View> : null}

      {hasExplanation && !photo ? <View style={styles.wrap}>
        {(['continue', 'simpler', 'example', 'hint', 'more', 'map', 'draw', 'images', 'summary'] as const).map(id => <Pressable key={id} accessibilityRole="button" disabled={working} onPress={() => void send(actionMessages[id], id, exercise, false, { childLine: actionLines[id] })} style={[styles.chip, id === 'continue' && styles.chipMain, working && styles.dim]}><Text style={[styles.chipText, id === 'continue' && styles.sendText]}>{actionButtons[id]}</Text></Pressable>)}
      </View> : null}

      {photo ? <View style={styles.photoCard}>
        <Text style={styles.sectionTitle}>Vamos a leer tu tarea</Text>
        <Image source={{ uri: photo.uri }} style={styles.previewImg} resizeMode="contain" accessibilityLabel="Foto de la tarea pendiente de revisar" />
        <Text style={styles.hint}>Un ejercicio por foto, buena luz y letras enfocadas. La foto se envía a OpenAI o Anthropic al pulsar «Leer mi tarea».</Text>
        <View style={styles.wrap}>
          <PrimaryButton label={transcript === null ? 'Leer mi tarea' : 'Volver a leer la foto'} disabled={working} onPress={() => void readPhoto()} style={styles.action} />
          <PrimaryButton label="Quitar foto" variant="secondary" disabled={working} onPress={() => { setPhoto(null); setTranscript(null); setNeedsRetake(false); setError(''); setRetry(null); }} style={styles.action} />
        </View>
        {transcript !== null ? <View style={styles.transcript}>
          <Text style={styles.sectionTitle}>Esto es lo que pude leer</Text>
          <Text style={styles.hint}>{needsRetake ? 'No pude leerlo todo. Toma otra foto o completa el texto.' : 'Compáralo con tu hoja y corrige cualquier letra o número antes de empezar.'} Los símbolos [?] necesitan revisión.</Text>
          <TextInput accessibilityLabel="Texto reconocido de la tarea" value={transcript} onChangeText={value => { setTranscript(value); setNeedsRetake(false); }} multiline maxLength={4000} editable={!working} style={[styles.input, styles.transcriptInput]} />
          <PrimaryButton label="El texto está bien · Empezar" disabled={working || needsRetake || !transcript.trim() || transcript.includes('[?]')} onPress={() => void send('Ayúdame paso a paso con este ejercicio.', 'help', transcript.trim(), true)} />
        </View> : null}
      </View> : null}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  questionComposer: { flex: 1, minWidth: 0 },
  photoTools: { gap: 8, paddingTop: 12 },
  photoIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CDDCE9' },
  photoIconText: { fontSize: 23 },
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
  fullHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  newBoardButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.coral },
  newBoardText: { fontFamily: fonts.bodyBold, color: colors.white, fontSize: 16 },
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
  reviewBanner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderRadius: 12, backgroundColor: colors.mist },
  reviewText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  reviewActions: { flexShrink: 1, maxWidth: '100%' },
  historyItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 10, borderRadius: 14, backgroundColor: colors.paper },
  historyItemOn: { backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.sky },
  historyTime: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkMuted, paddingTop: 2 },
  flex: { flex: 1 },
  imageLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.mist, flexGrow: 1 },
  historyLine: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  historyChild: { color: '#2C60AE' },
  footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
});
