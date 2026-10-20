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
  scale?: number;
};

export function BigMenuTile({
  label,
  color,
  badge,
  onPress,
  locked,
  delay = 0,
  scale = 1,
}: Props) {
  const enter = useSharedValue(0.86);
  const press = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      enter.value = withSpring(1, { damping: 10, stiffness: 140 });
    }, delay);
    return () => clearTimeout(t);
  }, [delay, enter]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: enter.value * press.value }],
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
        <View style={[styles.face, { width: 64 * scale, height: 64 * scale }]}>
          <View style={[styles.faceEye, { left: 16 * scale }]} />
          <View style={[styles.faceEye, { right: 16 * scale }]} />
          <View style={styles.faceSmile} />
          <Text style={[styles.badgeText, { fontSize: 14 * scale, marginTop: 18 * scale }]}>
            {badge}
          </Text>
        </View>
        <Text style={[styles.label, { fontSize: 20 * scale + 2 }]}>{label}</Text>
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
    padding: 14,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  face: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  faceEye: {
    position: 'absolute',
    top: 18,
    width: 8,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  faceSmile: {
    position: 'absolute',
    bottom: 12,
    width: 20,
    height: 9,
    borderBottomWidth: 3,
    borderColor: colors.ink,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    color: colors.white,
  },
  label: {
    fontFamily: fonts.displayBold,
    color: colors.white,
    textAlign: 'center',
  },
  lock: {
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
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
