import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Ancla visual del hero: atmósfera de aprendizaje, sin cards. */
export function HeroArt() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.sky} />
      <View style={styles.sun} />
      <View style={[styles.blob, styles.blobLeft]} />
      <View style={[styles.blob, styles.blobRight]} />
      <View style={styles.hill} />
      <View style={styles.hillFront} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  sun: {
    position: 'absolute',
    right: 28,
    top: 72,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.sun,
    opacity: 0.95,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  blobLeft: {
    width: 160,
    height: 160,
    left: -40,
    top: 120,
    backgroundColor: colors.sky,
  },
  blobRight: {
    width: 120,
    height: 120,
    right: -20,
    top: 200,
    backgroundColor: colors.coralSoft,
  },
  hill: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -30,
    height: 140,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: colors.leaf,
    opacity: 0.55,
  },
  hillFront: {
    position: 'absolute',
    left: -20,
    right: 40,
    bottom: -40,
    height: 110,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: colors.leafDeep,
    opacity: 0.7,
  },
});
