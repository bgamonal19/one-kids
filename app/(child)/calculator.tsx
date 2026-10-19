import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';

const KEYS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['0', '.', '=', '+'],
  ['C', '⌫'],
];

export default function CalculatorScreen() {
  const [display, setDisplay] = useState('0');
  const [a, setA] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const liveOp = useMemo(() => {
    if (a !== null && op) return `${a} ${op} ${fresh ? '' : display}`.trim();
    return expression || display;
  }, [a, op, display, fresh, expression]);

  const press = (key: string) => {
    Haptics.selectionAsync();
    if (key === 'C') {
      setDisplay('0');
      setA(null);
      setOp(null);
      setFresh(true);
      setExpression('');
      return;
    }
    if (key === '⌫') {
      setDisplay((d) => (d.length <= 1 ? '0' : d.slice(0, -1)));
      return;
    }
    if ('÷×−+'.includes(key)) {
      const left = Number(display);
      setA(left);
      setOp(key);
      setExpression(`${left} ${key}`);
      setFresh(true);
      return;
    }
    if (key === '=') {
      if (a === null || !op) return;
      const b = Number(display);
      let result = 0;
      if (op === '+') result = a + b;
      if (op === '−') result = a - b;
      if (op === '×') result = a * b;
      if (op === '÷') result = b === 0 ? NaN : a / b;
      const resultText = Number.isFinite(result) ? String(Number(result.toFixed(6))) : 'Error';
      const full = `${a} ${op} ${b} = ${resultText}`;
      setExpression(full);
      setHistory((h) => [full, ...h].slice(0, 6));
      setDisplay(resultText);
      setA(null);
      setOp(null);
      setFresh(true);
      return;
    }
    setDisplay((d) => {
      if (fresh || d === '0') return key === '.' ? '0.' : key;
      if (key === '.' && d.includes('.')) return d;
      return d + key;
    });
    setFresh(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Calculadora</Text>
      <Text style={styles.hint}>Mira la operación completa arriba y el resultado abajo.</Text>

      <View style={styles.display}>
        <Text style={styles.opLine} numberOfLines={2}>
          {liveOp}
        </Text>
        <Text style={styles.displayText} numberOfLines={1}>
          {display}
        </Text>
      </View>

      <View style={styles.pad}>
        {KEYS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [
                  styles.key,
                  '÷×−+='.includes(key) && styles.keyOp,
                  key === 'C' && styles.keyClear,
                  pressed && styles.keyPressed,
                ]}
              >
                <Text
                  style={[
                    styles.keyText,
                    ('÷×−+='.includes(key) || key === 'C') && styles.keyTextLight,
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {history.length > 0 ? (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Operaciones recientes</Text>
          {history.map((item) => (
            <Text key={item} style={styles.historyItem}>
              {item}
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  hint: {
    marginTop: 6,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  display: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    minHeight: 110,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: spacing.lg,
    gap: 6,
  },
  opLine: {
    fontFamily: fonts.bodySemi,
    fontSize: 20,
    color: colors.inkMuted,
    textAlign: 'right',
  },
  displayText: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    color: colors.ink,
    textAlign: 'right',
  },
  pad: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1,
    minHeight: 72,
    borderRadius: radii.md,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyOp: { backgroundColor: colors.sky },
  keyClear: { backgroundColor: colors.coral },
  keyPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  keyText: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  keyTextLight: { color: colors.white },
  history: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
  },
  historyTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 4,
  },
  historyItem: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.inkMuted,
  },
});
