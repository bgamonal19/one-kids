import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HandwritingPad, type HandwritingPadHandle, type Stroke } from '@/components/HandwritingPad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskCamera, type TaskPhoto } from '@/components/TaskCamera';
import { TutorWhiteboard, type BoardPhase } from '@/components/TutorWhiteboard';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useTutorSpeech } from '@/hooks/useTutorSpeech';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { askTutor, getTutorStatus, type TutorAction, type TutorProvider, type TutorStatus } from '@/lib/tutor';
import type { TutorMessage } from '@/lib/types';

type Message = TutorMessage & { source?: 'openai' | 'anthropic' | 'local' };
type Photo = { uri: string; data: string };
type Answer = { handwriting?: string; childLine?: string };
type Retry = { message: string; action: TutorAction; exercise: string; fresh: boolean; answer: Answer };
type Page = { key: string; lines: string[]; childLine?: string; reply?: string; replyId?: string; source?: Message['source'] };
type InputMode = 'pen' | 'keys' | 'voice';
const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const labels = { openai: 'OpenAI', anthropic: 'Claude · Anthropic', local: 'Práctica sin IA' };
const actionMessages = {
  continue: 'Ya entendí. Continuemos con el siguiente paso.',
  simpler: 'Explícame este mismo paso con palabras más fáciles.',
  example: 'Muéstrame otro ejemplo para entender este paso.',
  hint: 'Dame una pista sin decirme la respuesta.',
} as const;
const actionLines = { continue: 'Ya entendí 👍', simpler: 'Más fácil, por favor', example: 'Otro ejemplo', hint: 'Una pista' } as const;
const penColors = ['#1F3A5F', '#2C60AE', '#E2553A', '#23935F'] as const;

export default function TutorScreen() {
  const { state } = useFamily();
  const age = state.child?.age ?? 8;
  const band = getAgeBand(age);
  const [status, setStatus] = useState<TutorStatus | null>(null);
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const { speakingId, speechError, speak, stop } = useTutorSpeech(age);
  const refreshConnection = useCallback(async () => {
    try {
      const next = await getTutorStatus();
      if (alive.current) { setStatus(next); setConnectionError(''); }
    } catch {
      if (alive.current) { setStatus(null); setConnectionError('No pudimos comprobar la conexión.'); }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void getTutorStatus().then(next => {
      if (alive.current) { setStatus(next); setConnectionError(''); }
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
  const present = (next: Page) => {
    const generation = ++turn.current.generation;
    turn.current = { generation, written: false, spoken: !voiceOn || !next.reply };
    const chars = Math.max(1, next.lines.join('').length);
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
      const result = await askTutor({ ageBand: band, childName: '', message: message.trim(), handwriting: answer.handwriting, action, provider, exercise: confirmedExercise, history: previous.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, text: m.text })) });
      if (!alive.current) return;
      const heard = answer.handwriting ? result.heard?.trim() || '(no se pudo leer)' : '';
      const reply: Message = { id: uid(), role: 'tutor', text: result.reply, source: result.source };
      setMessages([...previous, { id: uid(), role: 'child', text: fresh ? `Mi tarea:\n${confirmedExercise}` : answer.handwriting ? `Escribí en la pizarra: ${heard}` : message.trim() }, reply]);
      setInput(''); setExercise(confirmedExercise);
      if (answer.handwriting) pad.current?.clear();
      if (fresh) { setPhoto(null); setTranscript(null); setNeedsRetake(false); }
      present({ key: reply.id, lines: result.board?.length ? result.board : [result.reply], childLine: answer.handwriting ? `✏️ ${heard}` : childLine, reply: result.reply, replyId: reply.id, source: result.source });
      if (action === 'hint') react('hint', 6000, 'explain');
      if (result.source === 'local') setStatus({ configured: false, providers: [], vision: false });
    } catch (e) {
      if (alive.current) { setError(e instanceof Error ? e.message : 'No se pudo recibir la respuesta.'); setRetry({ message, action, exercise: confirmedExercise, fresh, answer }); setPage(previousPage); setPhase('turn'); react('retry'); }
    } finally { busy.current = false; if (alive.current) setLoading(null); }
  };
  const sendDrawing = async () => {
    const image = await pad.current?.toImage();
    if (!image) { setError('Escribe tu respuesta en la pizarra antes de enviarla.'); return; }
    await send('', 'help', exercise, false, { handwriting: image, childLine: '✏️ …' });
  };
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
    <HandwritingPad ref={pad} height={full ? Math.max(200, height - insets.top - insets.bottom - (wide ? 480 : 450)) : wide ? 230 : 170} color={penColor} enabled={yourTurn} initialStrokes={ink} placeholder={yourTurn ? 'Escribe aquí tu respuesta con el dedo o el lápiz ✏️' : 'Espera a que el tutor termine de escribir…'} onStrokesChange={setInk} onDrawingChange={setDrawing} />
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
  const board = (full: boolean) => <TutorWhiteboard phase={phase} pageKey={page.key} lines={page.lines} childLine={page.childLine} pace={pace} expression={expression} bubble={bubble} width={full ? width - 24 : stageWidth} onWritten={onWritten}>
    {mode === 'pen' || full ? answerPad(full) : null}
  </TutorWhiteboard>;

  return (
    <Screen scroll scrollEnabled={!drawing} scrollRef={scroller}>
      <Modal visible={fullscreen} animationType="slide" onRequestClose={closeFullscreen} supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.fullRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.fullHeader}>
            <Text style={styles.sectionTitle}>Pizarra</Text>
            <Pressable accessibilityRole="button" onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.tool}><Text style={styles.toolText}>{voiceOn ? '🔊' : '🔇'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Salir de pantalla completa" onPress={closeFullscreen} style={[styles.tool, styles.exitTool]}><Text style={styles.toolText}>✕ Salir</Text></Pressable>
          </View>
          {board(true)}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </View>
      </Modal>
      {cameraOpen ? <TaskCamera onClose={() => setCameraOpen(false)} onCapture={captured => void pickPhoto(false, captured)} /> : null}
      <Text style={styles.eyebrow}>APRENDEMOS A TU RITMO</Text>
      <Text style={styles.title}>La pizarra de tu tutor</Text>
      <View onLayout={e => { setStageWidth(e.nativeEvent.layout.width); stageY.current = e.nativeEvent.layout.y; }}>
        {fullscreen ? <Text style={styles.hint}>La pizarra está en pantalla completa.</Text> : board(false)}
      </View>

      <View style={styles.modes} accessibilityRole="tablist">
        {modes.map(m => <Pressable key={m.id} accessibilityRole="tab" accessibilityState={{ selected: mode === m.id }} onPress={() => { setMode(m.id); if (m.id !== 'voice') listening.stop(); }} style={[styles.mode, mode === m.id && styles.modeOn]}><Text style={[styles.modeText, mode === m.id && styles.modeTextOn]}>{m.label}</Text></Pressable>)}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceOn }} onPress={() => { if (voiceOn) { void stop(); markSpoken(turn.current.generation); } setVoiceOn(!voiceOn); }} style={styles.mode}><Text style={styles.modeText}>{voiceOn ? '🔊 Voz' : '🔇 Sin voz'}</Text></Pressable>
      </View>

      {mode === 'keys' ? <View style={styles.composer}>
        <TextInput accessibilityLabel="Tu respuesta o tu duda para el tutor" value={input} onFocus={() => { if (!loading) react('listen'); }} onChangeText={setInput} placeholder={listening.supported ? 'Escribe tu respuesta o tu duda…' : 'Escribe tu respuesta o tu duda… (o usa el micrófono del teclado 🎤)'} placeholderTextColor={colors.inkMuted} multiline maxLength={2000} editable={!loading} style={styles.input} />
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
      {speechError ? <Text accessibilityRole="alert" style={styles.error}>{speechError}</Text> : null}
      {loading === 'photo' || loading === 'read' ? <View style={styles.loading}><ActivityIndicator color={colors.coral} /><Text style={styles.hint}>{loading === 'photo' ? 'Preparando foto…' : 'Leyendo la escritura…'}</Text></View> : null}
      {loading === 'photo' ? <PrimaryButton label="Cancelar preparación de foto" variant="secondary" onPress={() => { photoGeneration.current++; busy.current = false; setLoading(null); }} /> : null}
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry ? <PrimaryButton label="Reintentar" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(retry.message, retry.action, retry.exercise, retry.fresh, retry.answer)} /> : null}</View> : null}

      {hasExplanation && !photo ? <View style={styles.wrap}>
        {(['continue', 'simpler', 'example', 'hint'] as const).map(id => <Pressable key={id} accessibilityRole="button" disabled={Boolean(loading)} onPress={() => void send(actionMessages[id], id, exercise, false, { childLine: actionLines[id] })} style={[styles.chip, id === 'continue' && styles.chipMain, Boolean(loading) && styles.dim]}><Text style={[styles.chipText, id === 'continue' && styles.sendText]}>{{ continue: 'Ya entendí · Seguir →', simpler: 'Más fácil', example: 'Otro ejemplo', hint: 'Una pista' }[id]}</Text></Pressable>)}
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

      {messages.length > 1 ? <View style={styles.composer}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: historyOpen }} onPress={() => setHistoryOpen(!historyOpen)}><Text style={styles.link}>{historyOpen ? '▾ Ocultar la conversación' : '▸ Ver toda la conversación'}</Text></Pressable>
        {historyOpen ? messages.map(m => <Text key={m.id} style={[styles.historyLine, m.role === 'child' && styles.historyChild]} selectable>{m.role === 'child' ? 'Tú: ' : 'Tutor: '}{m.text}</Text>) : null}
      </View> : null}

      <View style={styles.connection}>
        <Text style={styles.eyebrow}>PARA ADULTOS</Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">{modeText}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refreshConnection()} disabled={Boolean(loading)}><Text style={styles.link}>Comprobar conexión</Text></Pressable>
        {status?.configured ? <View style={styles.wrap}>
          {(['auto', 'openai', 'anthropic'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Usar ${id === 'auto' ? 'conexión automática' : labels[id]}`} accessibilityState={{ selected: provider === id, disabled: id !== 'auto' && !status.providers.includes(id) }} disabled={Boolean(loading) || (id !== 'auto' && !status.providers.includes(id))} onPress={() => setProvider(id)} style={[styles.provider, provider === id && styles.providerSelected]}><Text style={styles.providerText}>{id === 'auto' ? 'Automático' : labels[id]}</Text></Pressable>)}
        </View> : null}
        <Text style={styles.footnote}>La voz del tutor usa la lectura del dispositivo y el dictado usa el reconocimiento de voz del navegador. Lo que el niño escribe en la pizarra se envía como imagen a la IA solo al pulsar «Enviar». Las fotos no se guardan en el perfil.</Text>
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
  fullRoot: { flex: 1, backgroundColor: colors.mist, paddingHorizontal: 12 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exitTool: { marginLeft: 'auto', backgroundColor: colors.white, borderWidth: 1, borderColor: '#CDDCE9' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
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
  historyLine: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  historyChild: { color: '#2C60AE' },
  footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
});
