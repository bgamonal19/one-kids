import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/constants/theme';

type Props = {
  text: string;
  scale?: number;
};

export function SpeechBubble({ text, scale = 1 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={[styles.text, { fontSize: 15 * scale + 1, lineHeight: 22 * scale }]}>{text}</Text>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', maxWidth: 320 },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 3,
    borderColor: colors.sky,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 24,
  },
  tail: {
    width: 0,
    height: 0,
    marginLeft: 28,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.sky,
  },
});
