import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, radii } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { PERIOD_LABEL, requestReport, type ParentReport as Report } from '@/lib/study';
import { reportInput, type ReportMemory, type ReportPeriod } from '@/lib/study-plan';
import { loadHistory } from '@/lib/tutor-history';

/** Tutor sessions kept on this device: the summaries the tutor wrote when a topic was finished. */
async function tutorNotes(childId: string): Promise<ReportMemory[]> {
  const history = await loadHistory(childId);
  return Object.values(history).flat().filter((e) => e.summary?.length).map((e) => ({ at: e.at, course: '', topic: e.childLine ?? '', summary: (e.summary ?? []).join(' ') }));
}

export function ParentReport() {
  const { state } = useFamily();
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!state.child) return null;

  const ask = async (preset?: string) => {
    setLoading(true); setError(''); setReport(null);
    try {
      const notes = await tutorNotes(state.child!.id).catch(() => []);
      setReport(await requestReport(reportInput(state, period, notes), preset ?? question));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el resumen.'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🧑‍🏫 Pedir resumen al tutor</Text>
      <Text style={styles.sub}>El tutor revisa las tareas, el avance del temario y las sesiones de {state.child.name} y te dice qué hizo y qué le falta.</Text>
      <View style={styles.chips}>
        {(Object.keys(PERIOD_LABEL) as ReportPeriod[]).map((p) => (
          <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: p === period }} onPress={() => setPeriod(p)} style={[styles.chip, p === period && styles.chipOn]}>
            <Text style={[styles.chipText, p === period && { color: colors.white }]}>{PERIOD_LABEL[p]}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label={loading ? 'Preparando…' : '¿Qué hizo y qué le falta?'} onPress={() => void ask('')} disabled={loading} />
      <TextInput value={question} onChangeText={setQuestion} placeholder="O pregunta algo concreto: ¿cómo va en Matemáticas?" placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={500} onSubmitEditing={() => void ask()} />
      <PrimaryButton label="Preguntar" variant="secondary" onPress={() => void ask()} disabled={loading || !question.trim()} />
      {loading ? <ActivityIndicator color={colors.skyDeep} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {report ? (
        <View style={styles.report}>
          <Text style={styles.body}>{report.summary}</Text>
          {report.done.length ? <><Text style={styles.label}>✅ Hecho</Text>{report.done.map((d) => <Text key={d} style={styles.item}>• {d}</Text>)}</> : null}
          {report.pending.length ? <><Text style={styles.label}>⏳ Le falta</Text>{report.pending.map((d) => <Text key={d} style={styles.item}>• {d}</Text>)}</> : null}
          {report.tips.length ? <><Text style={styles.label}>💡 Para acompañarlo</Text>{report.tips.map((d) => <Text key={d} style={styles.item}>• {d}</Text>)}</> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radii.md, padding: 16, marginBottom: 10, gap: 10 },
  title: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 18 },
  sub: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.mist, borderRadius: radii.pill, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.skyDeep },
  chipText: { fontFamily: fonts.bodySemi, color: colors.ink },
  input: { backgroundColor: colors.paper, padding: 14, borderRadius: radii.md, fontFamily: fonts.body, color: colors.ink, fontSize: 16 },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
  report: { backgroundColor: colors.mist, borderRadius: radii.md, padding: 14, gap: 6 },
  body: { fontFamily: fonts.body, color: colors.ink, fontSize: 16, lineHeight: 23 },
  label: { marginTop: 6, fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  item: { fontFamily: fonts.body, color: colors.ink, fontSize: 15 },
});
