import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFamily } from '@/lib/store';
import { getTutorStatus, type TutorProvider, type TutorStatus } from '@/lib/tutor';
import { loadTutorProvider, saveTutorProvider } from '@/lib/tutor-preferences';
import { colors, fonts } from '@/constants/theme';

export function TutorConnectionSettings() {
  const { state } = useFamily();
  const family = state.parent?.id || 'demo';
  const [status, setStatus] = useState<TutorStatus>();
  const [provider, setProvider] = useState<TutorProvider>('auto');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [next, preferred] = await Promise.all([getTutorStatus(), loadTutorProvider(family)]);
      setStatus(next); setProvider(preferred); setError('');
    } catch { setError('No pudimos comprobar la conexión. Inténtalo otra vez.'); }
    finally { setBusy(false); }
  }, [family]);
  useEffect(() => {
    let active = true;
    void Promise.all([getTutorStatus(), loadTutorProvider(family)])
      .then(([next, preferred]) => { if (active) { setStatus(next); setProvider(preferred); setBusy(false); } })
      .catch(() => { if (active) { setError('No pudimos comprobar la conexión.'); setBusy(false); } });
    return () => { active = false; };
  }, [family]);
  const choose = async (value: TutorProvider) => {
    setBusy(true); setError('');
    try { await saveTutorProvider(family, value); setProvider(value); }
    catch { setError('No se pudo guardar la preferencia.'); }
    finally { setBusy(false); }
  };
  const labels = { auto: 'Automático', openai: 'OpenAI', anthropic: 'Claude · Anthropic' };
  return <View style={s.card}>
    <Text style={s.title}>PARA ADULTOS · Conexión del tutor</Text>
    <Text style={s.text}>{status ? status.configured ? `IA configurada · ${status.providers.map(p => labels[p]).join(' y ')}` : 'La IA y la lectura de fotos están pendientes de activar.' : 'Comprobando conexión…'}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setBusy(true); setError(''); void refresh(); }} style={s.button}><Text style={s.text}>{busy ? 'Comprobando…' : 'Comprobar conexión'}</Text></Pressable>
    {status?.configured ? <View style={s.row}>{(['auto', 'openai', 'anthropic'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Usar ${labels[value]}`} accessibilityState={{ selected: value === provider }} disabled={busy || (value !== 'auto' && !status.providers.includes(value))} onPress={() => void choose(value)} style={[s.button, value === provider && s.selected]}><Text style={s.text}>{labels[value]}</Text></Pressable>)}</View> : null}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    <Text style={s.note}>Las voces naturales de OpenAI cuentan en el límite mensual; las voces del dispositivo son gratis. El dictado usa el reconocimiento de voz del navegador. La escritura y las fotos de tareas se envían a la IA cuando el estudiante pulsa Enviar o Leer mi tarea. Las fotos no se guardan en el perfil. Las pizarras de los últimos 14 días se guardan en este dispositivo. La preferencia de proveedor se aplica al tutor en este equipo.</Text>
  </View>;
}
const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 18, gap: 12, marginBottom: 12 },
  title: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 17 },
  text: { fontFamily: fonts.bodySemi, color: colors.ink, fontSize: 15 },
  note: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: '#CDDCE9', borderRadius: 12 },
  selected: { backgroundColor: colors.mist, borderColor: colors.sky },
  error: { color: '#9D3025', fontFamily: fonts.bodySemi },
});
