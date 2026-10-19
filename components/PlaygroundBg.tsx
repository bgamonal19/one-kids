import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

/** Fondo tipo patio de juegos (inspirado en apps infantiles). */
export function PlaygroundBg() {
  const cloud1 = useSharedValue(0);
  const cloud2 = useSharedValue(0);

  useEffect(() => {
    cloud1.value = withRepeat(
      withTiming(18, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    cloud2.value = withRepeat(
      withTiming(-14, { duration: 6500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [cloud1, cloud2]);

  const c1 = useAnimatedStyle(() => ({ transform: [{ translateX: cloud1.value }] }));
  const c2 = useAnimatedStyle(() => ({ transform: [{ translateX: cloud2.value }] }));

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.sky} />
      <Animated.View style={[styles.cloud, styles.cloudA, c1]} />
      <Animated.View style={[styles.cloud, styles.cloudB, c2]} />
      <View style={styles.hillBack} />
      <View style={styles.hillFront} />
      <View style={styles.sun} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#BFEFFF',
  },
  sun: {
    position: 'absolute',
    right: 40,
    top: 36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sun,
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
  },
  cloudA: { width: 110, height: 42, top: 70, left: 40 },
  cloudB: { width: 90, height: 36, top: 110, right: 80 },
  hillBack: {
    position: 'absolute',
    left: -60,
    right: -60,
    bottom: -40,
    height: 160,
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
    backgroundColor: '#7ED9A8',
  },
  hillFront: {
    position: 'absolute',
    left: -40,
    right: 80,
    bottom: -50,
    height: 120,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: colors.leafDeep,
    opacity: 0.85,
  },
});
