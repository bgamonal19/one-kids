import type * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AI_VOICES, aiVoicesAvailable, deviceSpanishVoices, type VoiceChoice } from '@/lib/voices';
import { colors, fonts, radii } from '@/constants/theme';

const same = (a: VoiceChoice, b: VoiceChoice) => a.kind === b.kind && (a.kind === 'auto' || a.id === (b as { id: string }).id);
const region = (language: string) => ({ ES: 'España', MX: 'México', US: 'EE. UU.', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Perú', '419': 'Latinoamérica' } as Record<string, string>)[language.split(/[-_]/)[1]?.toUpperCase() ?? ''] ?? language;

/** Lets the child or a parent pick and hear the tutor's voice. Tapping a voice plays a short sample. */
export function VoicePicker({ visible, value, onChange, onPreview, onClose }: { visible: boolean; value: VoiceChoice; onChange: (choice: VoiceChoice) => void; onPreview: (choice: VoiceChoice) => void; onClose: () => void }) {
  const [device, setDevice] = useState<Speech.Voice[] | null>(null);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    void deviceSpanishVoices().then(voices => { if (active) setDevice(voices.slice(0, 12)); });
    return () => { active = false; };
  }, [visible]);
  const pick = (choice: VoiceChoice) => { onChange(choice); onPreview(choice); };
  const row = (choice: VoiceChoice, label: string, hint: string) => {
    const on = same(value, choice);
    return <Pressable key={`${choice.kind}-${'id' in choice ? choice.id : ''}`} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => pick(choice)} style={[s.row, on && s.rowOn]}>
      <Text style={s.check}>{on ? '●' : '○'}</Text>
      <View style={s.flex}><Text style={s.name}>{label}</Text><Text style={s.hint}>{hint}</Text></View>
      <Text style={s.play}>▶</Text>
    </Pressable>;
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}><Text style={s.title}>🗣️ Voz del tutor</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={s.close}><Text style={s.closeText}>✕</Text></Pressable></View>
          <Text style={s.hint}>Toca una voz para escucharla. Se queda guardada en este dispositivo.</Text>
          <ScrollView style={s.list} contentContainerStyle={s.listBody}>
            {aiVoicesAvailable ? <>
              <Text style={s.section}>✨ Voces naturales</Text>
              <Text style={s.hint}>Suenan como una persona. Necesitan internet y cuentan un poco más en el límite mensual del tutor.</Text>
              {AI_VOICES.map(v => row({ kind: 'ai', id: v.id }, v.label, v.hint))}
            </> : null}
            <Text style={s.section}>📱 Voces del dispositivo</Text>
            <Text style={s.hint}>Gratis y sin internet. Algunas suenan más robóticas.</Text>
            {row({ kind: 'auto' }, 'La mejor disponible', 'Elegimos la voz en español más natural de este dispositivo')}
            {device === null ? <Text style={s.hint}>Buscando voces…</Text>
              : device.length === 0 ? <Text style={s.hint}>Este dispositivo no tiene otras voces en español.</Text>
              : device.map(v => row({ kind: 'device', id: v.identifier }, v.name.replace(/^(Microsoft|Google)\s+/, ''), region(v.language)))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={s.done}><Text style={s.doneText}>Listo</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,30,45,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: colors.white, borderRadius: radii.md, padding: 18, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: colors.inkMuted },
  list: { flexGrow: 0 },
  listBody: { gap: 6, paddingBottom: 6 },
  section: { marginTop: 10, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.md, backgroundColor: colors.mist },
  rowOn: { backgroundColor: '#D9F2E3', borderWidth: 2, borderColor: colors.leafDeep },
  check: { fontSize: 16, color: colors.leafDeep, width: 18 },
  flex: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  play: { fontSize: 16, color: colors.skyDeep },
  done: { minHeight: 48, borderRadius: radii.pill, backgroundColor: colors.skyDeep, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: fonts.bodyBold, color: colors.white, fontSize: 16 },
});
