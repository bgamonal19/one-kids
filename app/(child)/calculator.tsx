import { useState } from 'react';
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

  const press = (key: string) => {
    Haptics.selectionAsync();
    if (key === 'C') {
      setDisplay('0');
      setA(null);
      setOp(null);
      setFresh(true);
      return;
    }
    if (key === '⌫') {
      setDisplay((d) => (d.length <= 1 ? '0' : d.slice(0, -1)));
      return;
    }
    if ('÷×−+'.includes(key)) {
      setA(Number(display));
      setOp(key);
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
      setDisplay(Number.isFinite(result) ? String(Number(result.toFixed(6))) : 'Error');
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
    <Screen>
      <Text style={styles.title}>Calculadora</Text>
      <View style={styles.display}>
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
                  row.length === 2 && styles.keyWide,
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  display: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    minHeight: 88,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: spacing.lg,
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
  keyWide: { flex: 1 },
  keyOp: { backgroundColor: colors.sky },
  keyClear: { backgroundColor: colors.coral },
  keyPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  keyText: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  keyTextLight: { color: colors.white },
});

