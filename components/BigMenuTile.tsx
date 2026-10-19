import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radii } from '@/constants/theme';

type Props = {
  label: string;
  color: string;
  badge: string;
  onPress: () => void;
  locked?: boolean;
  delay?: number;
};

export function BigMenuTile({ label, color, badge, onPress, locked, delay = 0 }: Props) {
  const scale = useSharedValue(0.86);
  const press = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 140 });
    }, delay);
    return () => clearTimeout(t);
  }, [delay, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * press.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, anim]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          press.value = withTiming(0.94, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withSpring(1);
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          press.value = withSequence(withTiming(1.05, { duration: 90 }), withSpring(1));
          onPress();
        }}
        style={[styles.tile, { backgroundColor: locked ? '#8A9AAB' : color }]}
      >
        <View style={styles.face}>
          <View style={[styles.faceEye, { left: 18 }]} />
          <View style={[styles.faceEye, { right: 18 }]} />
          <View style={styles.faceSmile} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
        {locked ? <Text style={styles.lock}>Casi… termina tareas</Text> : null}
        <View style={styles.shine} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 140,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  face: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  faceEye: {
    position: 'absolute',
    top: 20,
    width: 8,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  faceSmile: {
    position: 'absolute',
    bottom: 14,
    width: 22,
    height: 10,
    borderBottomWidth: 3,
    borderColor: colors.ink,
    borderRadius: 10,
  },
  badgeText: {
    marginTop: 20,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.white,
  },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
  },
  lock: {
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
