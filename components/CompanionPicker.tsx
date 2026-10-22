import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { COMPANIONS, COMPANION_IDS, type CompanionId } from '@/lib/companions';
import { colors, fonts } from '@/constants/theme';
import { EXPRESSIONS, hasExpressions, type ExpressionId } from '@/lib/expressions';
import { KikoMascot } from './KikoMascot';

export function CompanionPicker({ value, onChange, age }: { value: CompanionId; onChange: (id: CompanionId) => void; age: number }) {
  const [mood, setMood] = useState<ExpressionId>('hello');
  const { width } = useWindowDimensions();
  const selected = COMPANIONS[value];
  const cardWidth = width < 600 ? '47%' : width < 1000 ? '31%' : '23%';
  return (
    <View>
      <Text style={s.heading}>Tu compañero 3D</Text>
      <Text style={s.hint}>Doce compañeros con 15 expresiones cada uno. Elige quien te acompañará en Inicio y en el Tutor IA.</Text>
      <View style={[s.preview, { backgroundColor: selected.color + '12', borderColor: selected.color + '40', flexDirection: width < 440 ? 'column' : 'row' }]}>
        <KikoMascot character={value} expression={mood} mood={mood === 'celebrate' ? 'celebrate' : 'happy'} age={age} size={180} />
        <View style={s.previewCopy}>
          <Text style={s.previewName}>{selected.name}</Text>
          <Text style={s.role}>{selected.role}</Text>
          <Text style={s.age}>Sugerido para {selected.ages}. Puedes elegir cualquiera.</Text>
          <Text style={s.motionNote}>{hasExpressions(value) ? 'Prueba sus 15 expresiones' : 'Vista previa del compañero'}</Text>
          <View style={s.controls}>
            {(hasExpressions(value) ? EXPRESSIONS : EXPRESSIONS.slice(0, 1)).map(item => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: mood === item.id }} onPress={() => setMood(item.id)} style={[s.control, mood === item.id && { backgroundColor: selected.color, borderColor: selected.color }]}>
                <Text style={[s.controlText, mood === item.id && s.white]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      {(['heroes', 'blocks'] as const).map(family => (
        <View key={family}>
          <Text style={s.family}>{family === 'heroes' ? 'Compañeros de aventura' : 'Aventuras de bloques'}</Text>
          <View style={s.grid}>
            {COMPANION_IDS.filter(id => COMPANIONS[id].family === family).map(id => {
              const c = COMPANIONS[id];
              const active = value === id;
              return (
                <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Elegir ${c.name}, ${c.role}`} accessibilityState={{ selected: active }} onPress={() => { onChange(id); setMood('hello'); }} style={({ pressed }) => [s.card, { width: cardWidth, borderColor: active ? c.color : '#E0E8F1', backgroundColor: active ? c.color + '12' : '#FFFFFF', opacity: pressed ? 0.8 : 1 }]}>
                  <View style={s.cardArt}><KikoMascot character={id} size={112} age={age} animated={false} expression="hello" /></View>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.cardRole}>{c.role}</Text>
                  <Text style={[s.choose, { color: c.color }]}>{active ? '✓ Elegido' : 'Elegir compañero'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={s.hint}>Guarda el perfil para conservar tu elección. Si prefieres menos movimiento, se respeta la configuración de accesibilidad de tu dispositivo.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  heading: { fontFamily: fonts.displayBold, fontSize: 25, color: colors.ink, marginTop: 24 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 21, marginTop: 8 },
  preview: { marginTop: 18, borderRadius: 26, borderWidth: 1, padding: 20, gap: 18, alignItems: 'center' },
  previewCopy: { flex: 1, gap: 5, width: '100%' },
  previewName: { fontFamily: fonts.displayBold, fontSize: 27, color: colors.ink },
  role: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 16 },
  age: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
  motionNote: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 12, marginTop: 12 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  control: { minHeight: 44, justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#CFDCEA', paddingHorizontal: 12 },
  controlText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 }, white: { color: '#FFFFFF' },
  family: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, marginTop: 26, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { borderRadius: 22, padding: 12, borderWidth: 2, alignItems: 'center', minHeight: 205 },
  cardArt: { height: 126, justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  cardRole: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  choose: { fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 10 },
});
