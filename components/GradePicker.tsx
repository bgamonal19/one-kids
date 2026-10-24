import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '@/constants/theme';
import { SCHOOL_COUNTRIES, schoolGrades } from '@/lib/school-grades';

export function GradePicker({ country, grade, onCountryChange, onGradeChange }: { country: string; grade: string; onCountryChange: (country: string) => void; onGradeChange: (grade: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 12, marginTop: 18 }}>
    <Text style={styles.title}>País donde estudia</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{SCHOOL_COUNTRIES.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === country }} onPress={() => { if (value !== country) { onCountryChange(value); onGradeChange(''); } }} style={[styles.option, value === country && styles.selected]}><Text style={styles.text}>{value}</Text></Pressable>)}</View>
    <Text style={styles.title}>Grado o curso de estudios</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar grado de estudios" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={styles.select}><Text style={styles.text}>{grade || 'Selecciona el grado escolar'}  ▾</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}><View style={styles.dialog}>
        <Text accessibilityRole="header" style={styles.title}>Elige el grado · {country}</Text>
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          {['Sin especificar', ...schoolGrades(country)].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: grade === value || (!grade && value === 'Sin especificar') }} onPress={() => { onGradeChange(value === 'Sin especificar' ? '' : value); setOpen(false); }} style={[styles.option, grade === value && styles.selected]}><Text style={styles.text}>{grade === value ? '✓ ' : ''}{value}</Text></Pressable>)}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.option}><Text style={styles.text}>← Volver sin cambiar</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  text: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  option: { padding: 14, borderRadius: radii.md, backgroundColor: colors.paper, marginVertical: 3, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: colors.skyDeep, backgroundColor: colors.mist },
  select: { padding: 16, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.skyDeep },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,40,60,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: colors.white, borderRadius: radii.lg, padding: 20, gap: 12 },
});
