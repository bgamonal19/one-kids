import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, fonts, radii } from '@/constants/theme';

type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ value, onChange, maxLength = 4 }: Props) {
  const press = (key: string) => {
    Haptics.selectionAsync();
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= maxLength) return;
    onChange(value + key);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, i) => (
          <Pressable
            key={`${key}-${i}`}
            disabled={!key}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, pressed && key ? styles.keyPressed : null]}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 24 },
  dots: { flexDirection: 'row', gap: 14 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.sky,
    backgroundColor: 'transparent',
  },
  dotOn: { backgroundColor: colors.sky, borderColor: colors.skyDeep },
  grid: {
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  key: {
    width: 72,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.sky, transform: [{ scale: 0.96 }] },
  keyText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
});
