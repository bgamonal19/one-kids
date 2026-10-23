import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CompanionStatus } from '@/components/CompanionStatus';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TaskCamera, type TaskPhoto } from '@/components/TaskCamera';
import { useCompanionReaction } from '@/hooks/useCompanionReaction';
import { useTutorSpeech } from '@/hooks/useTutorSpeech';
import { getAgeBand } from '@/lib/ages';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { askTutor, getTutorStatus, type TutorAction, type TutorProvider, type TutorStatus } from '@/lib/tutor';
import type { TutorMessage } from '@/lib/types';

type Message = TutorMessage & { source?: 'openai' | 'anthropic' | 'local' };
type Photo = { uri: string; data: string };
type Retry = { message: string; action: TutorAction; exercise: string; fresh: boolean };
const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const labels = { openai: 'OpenAI', anthropic: 'Claude · Anthropic', local: 'Práctica sin IA' };
const actionMessages = {
  continue: 'Ya entendí. Continuemos con el siguiente paso.',
  simpler: 'Explícame este mismo paso con palabras más fáciles.',
  example: 'Muéstrame otro ejemplo para entender este paso.',
  hint: 'Dame una pista sin decirme la respuesta.',
} as const;

export default function TutorScreen() {
  const { state } = useFamily();
  const age = state.child?.age ?? 8;
  const band = getAgeBand(age);
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [provider, setProvider] = useState<TutorProvider>('auto');
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'tutor', text: `¡Hola${state.child?.name ? `, ${state.child.name}` : ''}! Escribe tu duda o añade una foto de tu tarea. Vamos a aprender un paso a la vez. Puedes escuchar cada explicación y elegir cuándo continuar.` }]);
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
    return () => { alive.current = false; };
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

  const send = async (message = input, action: TutorAction = 'help', confirmedExercise = exercise, fresh = false) => {
    if (busy.current || !message.trim()) return;
    busy.current = true; setLoading('reply'); setError(''); setRetry(null); react('think');
    await stop().catch(() => {});
    const previous = fresh ? messages.filter(m => m.id === 'welcome') : messages;
    try {
      const result = await askTutor({ ageBand: band, childName: '', message: message.trim(), action, provider, exercise: confirmedExercise, history: previous.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, text: m.text })) });
      if (!alive.current) return;
      setMessages([...previous, { id: uid(), role: 'child', text: fresh ? `Mi tarea:\n${confirmedExercise}` : message.trim() }, { id: uid(), role: 'tutor', text: result.reply, source: result.source }]);
      setInput(''); setExercise(confirmedExercise);
      if (fresh) { setPhoto(null); setTranscript(null); setNeedsRetake(false); }
      react(action === 'hint' ? 'hint' : 'explain', 6000);
      if (result.source === 'local') setStatus({ configured: false, providers: [], vision: false });
    } catch (e) {
      if (alive.current) { setError(e instanceof Error ? e.message : 'No se pudo recibir la respuesta.'); setRetry({ message, action, exercise: confirmedExercise, fresh }); react('retry'); }
    } finally { busy.current = false; if (alive.current) setLoading(null); }
  };
  const hasExplanation = messages.some(m => m.source);
  const modeText = connectionError || (!status ? 'Comprobando conexión…' : status.configured ? `IA configurada · ${status.providers.map(id => labels[id]).join(' y ')}` : 'Modo práctica · IA y lectura de fotos pendientes de activar');

  return (
    <Screen scroll>
      {cameraOpen ? <TaskCamera onClose={() => setCameraOpen(false)} onCapture={captured => void pickPhoto(false, captured)} /> : null}
      <Text style={styles.eyebrow}>APRENDEMOS A TU RITMO</Text>
      <Text style={styles.title}>Tu tutor, paso a paso</Text>
      <Text style={styles.hint}>Pregunta, escucha y avanza cuando lo hayas entendido.</Text>
      <View style={styles.connection}>
        <Text style={styles.status} accessibilityLiveRegion="polite">{modeText}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refreshConnection()} disabled={Boolean(loading)}><Text style={styles.link}>Comprobar conexión</Text></Pressable>
        {status?.configured ? <View style={styles.wrap}>
          {(['auto', 'openai', 'anthropic'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Usar ${id === 'auto' ? 'conexión automática' : labels[id]}`} accessibilityState={{ selected: provider === id, disabled: id !== 'auto' && !status.providers.includes(id) }} disabled={Boolean(loading) || (id !== 'auto' && !status.providers.includes(id))} onPress={() => setProvider(id)} style={[styles.provider, provider === id && styles.providerSelected]}><Text style={styles.providerText}>{id === 'auto' ? 'Automático' : labels[id]}</Text></Pressable>)}
        </View> : null}
      </View>
      <CompanionStatus expression={expression} message={loading ? (loading === 'read' ? 'Estoy leyendo tu tarea…' : 'Estoy preparando el siguiente paso…') : undefined} />
      <View style={styles.chat}>
        {messages.map(m => <View key={m.id} style={[styles.bubble, m.role === 'child' ? styles.childBubble : styles.tutorBubble]}>
          <Text style={[styles.bubbleText, m.role === 'child' && styles.childText]} selectable>{m.text}</Text>
          {m.role === 'tutor' ? <View style={styles.messageFooter}>
            <Pressable accessibilityRole="button" accessibilityLabel={speakingId === m.id ? 'Detener lectura' : 'Escuchar explicación'} onPress={() => void speak(m.id, m.text)} style={styles.listen}><Text style={styles.link}>{speakingId === m.id ? '■ Detener' : '▶ Escuchar'}</Text></Pressable>
            {m.source ? <Text style={styles.source}>{labels[m.source]}</Text> : null}
          </View> : null}
        </View>)}
      </View>
      {speechError ? <Text accessibilityRole="alert" style={styles.error}>{speechError}</Text> : null}
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.coral} /><Text style={styles.hint}>{loading === 'photo' ? 'Preparando foto…' : loading === 'read' ? 'Leyendo la escritura…' : 'Preparando una explicación…'}</Text></View> : null}
      {loading === 'photo' ? <PrimaryButton label="Cancelar preparación de foto" variant="secondary" onPress={() => { photoGeneration.current++; busy.current = false; setLoading(null); }} /> : null}
      {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{retry ? <PrimaryButton label="Reintentar consulta" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(retry.message, retry.action, retry.exercise, retry.fresh)} /> : null}</View> : null}
      {hasExplanation && !photo ? <View style={styles.learning}>
        <Text style={styles.sectionTitle}>¿Cómo seguimos?</Text>
        <Text style={styles.hint}>Tú eliges. Podemos repetir las veces que necesites.</Text>
        <View style={styles.wrap}>
          <PrimaryButton label="Ya entendí · Continuar →" disabled={Boolean(loading)} onPress={() => void send(actionMessages.continue, 'continue')} style={styles.action} />
          <PrimaryButton label="Explícamelo más fácil" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(actionMessages.simpler, 'simpler')} style={styles.action} />
          <PrimaryButton label="Ver otro ejemplo" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(actionMessages.example, 'example')} style={styles.action} />
          <PrimaryButton label="Dame una pista" variant="secondary" disabled={Boolean(loading)} onPress={() => void send(actionMessages.hint, 'hint')} style={styles.action} />
        </View>
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
        <Text style={styles.sectionTitle}>{photo ? 'Elegir otra foto' : 'Tu turno'}</Text>
        {!photo ? <>
          <TextInput accessibilityLabel="Tu duda para el tutor" value={input} onFocus={() => { if (!loading) react('listen'); }} onChangeText={setInput} placeholder="Escribe el ejercicio o cuéntame qué no entiendes…" placeholderTextColor={colors.inkMuted} multiline maxLength={2000} editable={!loading} style={styles.input} />
          <PrimaryButton label="Enviar mi pregunta →" onPress={() => void send()} disabled={Boolean(loading) || !input.trim()} />
        </> : null}
        <View style={styles.wrap}>
          <PrimaryButton label="Tomar foto" variant="secondary" onPress={() => { if (Platform.OS === 'web') setCameraOpen(true); else void pickPhoto(true); }} disabled={Boolean(loading)} style={styles.action} />
          <PrimaryButton label="Subir foto" variant="secondary" onPress={() => void pickPhoto(false)} disabled={Boolean(loading)} style={styles.action} />
        </View>
        <Text style={styles.footnote}>La voz usa la lectura de tu dispositivo. Las fotos no se guardan en tu perfil. Revisa la lectura de la tarea con un adulto si tienes dudas.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.5, color: colors.inkMuted },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.ink, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 5 },
  connection: { backgroundColor: colors.white, borderRadius: radii.md, padding: 14, gap: 9, marginVertical: spacing.md },
  status: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  link: { fontFamily: fonts.bodyBold, color: '#2C60AE', fontSize: 14 },
  provider: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#CDDCE9', borderRadius: 12, paddingHorizontal: 14 },
  providerSelected: { backgroundColor: colors.mist, borderColor: colors.sky },
  providerText: { fontFamily: fonts.bodyBold, color: colors.ink },
  chat: { gap: 14, marginVertical: 16 },
  bubble: { borderRadius: 20, padding: 18, maxWidth: '94%', minWidth: 180 },
  tutorBubble: { alignSelf: 'flex-start', backgroundColor: colors.white },
  childBubble: { alignSelf: 'flex-end', backgroundColor: '#2D6DC1' },
  bubbleText: { fontFamily: fonts.body, color: colors.ink, fontSize: 17, lineHeight: 27 },
  childText: { color: colors.white },
  messageFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10 },
  listen: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: colors.mist, borderRadius: 12 },
  source: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  errorBox: { backgroundColor: '#FFF1EC', padding: 16, borderRadius: 16, gap: 12, marginVertical: 12 },
  error: { fontFamily: fonts.bodySemi, color: '#9D3025', lineHeight: 23 },
  learning: { backgroundColor: '#E4F4EE', padding: 18, borderRadius: 22, gap: 10, marginVertical: 12 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 21, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { flexGrow: 1, flexBasis: 220 },
  photoCard: { backgroundColor: colors.white, padding: 18, borderRadius: 22, gap: 14, marginVertical: 12 },
  previewImg: { width: '100%', height: 230, borderRadius: 14, backgroundColor: colors.paper },
  transcript: { gap: 12, backgroundColor: colors.paper, borderRadius: 16, padding: 14 },
  transcriptInput: { minHeight: 150, textAlignVertical: 'top' },
  composer: { backgroundColor: colors.white, padding: 18, borderRadius: 22, gap: 14, marginVertical: 16 },
  input: { backgroundColor: colors.paper, borderWidth: 1, borderColor: '#CEDDE9', borderRadius: radii.md, padding: 14, fontFamily: fonts.body, fontSize: 17, color: colors.ink, minHeight: 80, textAlignVertical: 'top' },
  footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: colors.inkMuted },
});
