import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { calculate, formatCalculation, type AngleUnit } from '@/lib/scientific-calculator';

const BASIC = [['C', '⌫', '(', ')'], ['7', '8', '9', '÷'], ['4', '5', '6', '×'], ['1', '2', '3', '−'], ['0', '.', '%', '+'], ['±', 'Ans', '=']];
const SCIENTIFIC = [
  ['sin', 'cos', 'tan', 'π', 'e'],
  ['asin', 'acos', 'atan', 'x²', 'xʸ'],
  ['sinh', 'cosh', 'tanh', '√', '∛'],
  ['asinh', 'acosh', 'atanh', 'ʸ√x', '1/x'],
  ['ln', 'log', 'logᵦ', 'eˣ', '10ˣ'],
  ['n!', 'nCr', 'nPr', '|x|', ','],
  ['floor', 'ceil', 'round', '×10ⁿ', 'x³'],
];
const INSERT: Record<string, string> = { 'x²': '^2', 'x³': '^3', 'xʸ': '^', '√': 'sqrt(', '∛': 'cbrt(', 'ʸ√x': 'root(', '1/x': '1/(', 'logᵦ': 'logb(', 'eˣ': 'exp(', '10ˣ': '10^(', 'n!': '!', '|x|': 'abs(', '×10ⁿ': '×10^(' };
const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'ln', 'log', 'nCr', 'nPr', 'floor', 'ceil', 'round']);
const LABEL: Record<string, string> = { asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', asinh: 'sinh⁻¹', acosh: 'cosh⁻¹', atanh: 'tanh⁻¹' };

export default function CalculatorScreen() {
  const [scientific, setScientific] = useState(false);
  const { width } = useWindowDimensions();
  const [unit, setUnit] = useState<AngleUnit>('DEG');
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [answer, setAnswer] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [memory, setMemory] = useState<number | null>(null);

  const press = (key: string) => {
    void Haptics.selectionAsync().catch(() => {});
    setError('');
    if (key === 'C') { setExpression(''); setResult('0'); setFresh(false); return; }
    if (key === '⌫') { setExpression(value => value.slice(0, -1)); setFresh(false); return; }
    if (key === '=') {
      try {
        const value = calculate(expression, unit, answer);
        const formatted = formatCalculation(value);
        setAnswer(value); setResult(formatted); setFresh(true);
        setHistory(items => [`${expression} = ${formatted}${scientific ? ` · ${unit}` : ''}`, ...items].slice(0, 8));
      } catch (e) { setError(e instanceof Error ? e.message : 'Revisa la operación.'); }
      return;
    }
    if (key === '1/x') { setExpression(value => value ? `1/(${value})` : '1/('); setFresh(false); return; }
    if (key === '±') { setExpression(value => value ? `-(${value})` : '-'); setFresh(false); return; }
    const insertion = INSERT[key] || (FUNCTIONS.has(key) ? `${key}(` : key);
    const continues = ['+', '−', '×', '÷', 'x²', 'x³', 'xʸ', 'n!', '%'].includes(key);
    setExpression(value => `${fresh ? continues ? `(${formatCalculation(answer)})` : '' : value}${insertion}`.slice(0, 500));
    setFresh(false);
  };
  const memoryAction = (action: string) => {
    setError('');
    if (action === 'MC') { setMemory(null); return; }
    if (action === 'MR') { setExpression(value => `${fresh ? '' : value}(${formatCalculation(memory ?? 0)})`); setFresh(false); return; }
    try {
      const value = calculate(expression || result, unit, answer);
      const next = action === 'MS' ? value : (memory ?? 0) + (action === 'M−' ? -value : value);
      if (!Number.isFinite(next)) throw new Error('El valor es demasiado grande para la memoria.');
      setMemory(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar en memoria.'); }
  };
  const keypad = (rows: string[][], small = false) => <View style={styles.pad}>{rows.map((row, i) => <View key={i} style={styles.row}>{row.map((key, j) => <Pressable key={`${key}-${j}`} accessibilityRole="button" accessibilityLabel={LABEL[key] || key} onPress={() => press(key)} style={({ pressed }) => [styles.key, small && styles.scientificKey, ['÷', '×', '−', '+', '='].includes(key) && styles.keyOp, key === 'C' && styles.keyClear, pressed && { opacity: 0.7 }]}><Text style={[styles.keyText, small && { fontSize: 17 }, ['÷', '×', '−', '+', '=', 'C'].includes(key) && { color: colors.white }]}>{LABEL[key] || key}</Text></Pressable>)}</View>)}</View>;

  return <Screen scroll>
    <Text style={styles.title}>🧮 Calculadora</Text>
    <View style={styles.row}>{[false, true].map(mode => <Pressable key={String(mode)} accessibilityRole="button" accessibilityState={{ selected: mode === scientific }} onPress={() => setScientific(mode)} style={[styles.mode, scientific === mode && styles.selected]}><Text style={styles.modeText}>{mode ? 'Científica' : 'Básica'}</Text></Pressable>)}</View>
    <Text style={styles.hint}>Escribe o toca los botones. La operación completa queda visible.</Text>
    <View style={styles.display}>
      <Text style={styles.hint}>Operación</Text>
      <TextInput accessibilityLabel="Operación matemática" value={expression} onChangeText={value => { setExpression(value); setFresh(false); setError(''); }} maxLength={500} placeholder="0" autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => press('=')} style={styles.operation} />
      <Text style={styles.hint}>{fresh ? 'Resultado' : 'Último resultado'}</Text>
      <Text accessibilityLabel="Resultado" accessibilityLiveRegion="polite" selectable style={styles.result}>{result}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
    <View style={{ flexDirection: scientific && width >= 900 ? 'row' : 'column', gap: 20 }}>
    {scientific ? <View style={{ flex: 1, gap: 12, marginBottom: 16 }}>
      <View style={styles.row}>{(['DEG', 'RAD'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === unit }} onPress={() => setUnit(value)} style={[styles.mode, value === unit && styles.selected]}><Text style={styles.modeText}>{value === 'DEG' ? 'DEG · Grados' : 'RAD · Radianes'}</Text></Pressable>)}</View>
      <Text style={styles.hint}>Usa paréntesis: sin(30), logb(8,2), root(27,3), nCr(5,2). % divide entre 100.</Text>
      <View style={styles.row}>{['MC', 'MR', 'MS', 'M+', 'M−'].map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Memoria ${key}`} onPress={() => memoryAction(key)} style={styles.memoryKey}><Text style={styles.modeText}>{key}</Text></Pressable>)}</View>
      <Text style={styles.hint}>Memoria: {memory === null ? 'vacía' : formatCalculation(memory)}</Text>
      {keypad(SCIENTIFIC, true)}
    </View> : null}
    <View style={{ flex: 1 }}>{keypad(BASIC)}</View>
    </View>
    {history.length ? <View style={styles.history}><Text style={styles.modeText}>Operaciones recientes</Text>{history.map((item, i) => <Text key={`${i}-${item}`} selectable style={styles.hint}>{item}</Text>)}</View> : null}
  </Screen>;
}
const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, marginBottom: 12 },
  hint: { fontFamily: fonts.body, color: colors.inkMuted, marginVertical: 6 },
  row: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, padding: 14, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.mist, alignItems: 'center' },
  selected: { borderColor: colors.skyDeep, backgroundColor: colors.mist },
  modeText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  display: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 18, marginVertical: spacing.md },
  operation: { fontFamily: fonts.bodySemi, fontSize: 22, color: colors.ink, textAlign: 'right', paddingVertical: 10 },
  result: { fontFamily: fonts.displayBold, fontSize: 36, color: colors.ink, textAlign: 'right' },
  error: { fontFamily: fonts.bodySemi, color: colors.coral, marginTop: 10 },
  pad: { gap: 8 },
  key: { flex: 1, minHeight: 64, backgroundColor: colors.mist, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  scientificKey: { minHeight: 52, backgroundColor: '#EAE5FC' },
  keyText: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.ink },
  keyOp: { backgroundColor: colors.skyDeep },
  keyClear: { backgroundColor: colors.coral },
  memoryKey: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderRadius: radii.sm },
  history: { marginTop: 24, backgroundColor: colors.white, borderRadius: radii.md, padding: 16 },
});
