import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';

type Props = {
  size?: 'hero' | 'nav';
  subtitle?: string;
};

export function BrandMark({ size = 'hero', subtitle }: Props) {
  const hero = size === 'hero';
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.wrap}>
      <Text style={[styles.brand, hero ? styles.brandHero : styles.brandNav]}>ONE KIDS</Text>
      {subtitle ? <Text style={[styles.sub, hero && styles.subHero]}>{subtitle}</Text> : null}
      {hero ? <View style={styles.underline} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  brand: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  brandHero: { fontSize: 48, lineHeight: 52 },
  brandNav: { fontSize: 22, lineHeight: 26 },
  sub: {
    marginTop: 8,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 15,
  },
  subHero: { fontSize: 17, maxWidth: 280 },
  underline: {
    marginTop: 14,
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.coral,
  },
});
