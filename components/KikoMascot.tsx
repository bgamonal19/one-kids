import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

export type KikoMood = 'happy' | 'wave' | 'think' | 'celebrate';

type Props = {
  mood?: KikoMood;
  size?: number;
};

/** Mascota guía de ONE KIDS (estilo apps infantiles tipo Khan Kids). */
export function KikoMascot({ mood = 'happy', size = 140 }: Props) {
  const bounce = useSharedValue(0);
  const arm = useSharedValue(0);
  const blink = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    blink.value = withRepeat(
      withSequence(
        withDelay(2200, withTiming(0.15, { duration: 80 })),
        withTiming(1, { duration: 80 })
      ),
      -1,
      false
    );
    if (mood === 'wave' || mood === 'celebrate') {
      arm.value = withRepeat(
        withSequence(
          withTiming(-18, { duration: 280 }),
          withTiming(12, { duration: 280 })
        ),
        -1,
        true
      );
    } else {
      arm.value = withTiming(0, { duration: 200 });
    }
    if (mood === 'celebrate') {
      spin.value = withRepeat(
        withSequence(withTiming(8, { duration: 200 }), withTiming(-8, { duration: 200 })),
        -1,
        true
      );
    } else {
      spin.value = withTiming(0, { duration: 200 });
    }
  }, [mood, arm, blink, bounce, spin]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${spin.value}deg` },
    ],
  }));

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arm.value}deg` }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const s = size;
  const bodyColor = mood === 'think' ? '#5BB8E8' : colors.sky;
  const cheek = mood === 'celebrate' ? '#FF8F75' : '#FFB4A2';

  return (
    <Animated.View style={[{ width: s, height: s * 1.15 }, bodyStyle]}>
      {/* ears */}
      <View style={[styles.ear, { left: s * 0.12, width: s * 0.22, height: s * 0.22, top: s * 0.08 }]} />
      <View style={[styles.ear, { right: s * 0.12, width: s * 0.22, height: s * 0.22, top: s * 0.08 }]} />

      {/* body */}
      <View
        style={[
          styles.body,
          {
            width: s * 0.86,
            height: s * 0.86,
            borderRadius: s * 0.43,
            backgroundColor: bodyColor,
            marginTop: s * 0.12,
            marginLeft: s * 0.07,
          },
        ]}
      >
        <View style={[styles.belly, { width: s * 0.48, height: s * 0.36, borderRadius: s * 0.24 }]} />

        {/* eyes */}
        <Animated.View
          style={[
            styles.eye,
            eyeStyle,
            { left: s * 0.22, top: s * 0.28, width: s * 0.12, height: s * 0.14 },
          ]}
        />
        <Animated.View
          style={[
            styles.eye,
            eyeStyle,
            { right: s * 0.22, top: s * 0.28, width: s * 0.12, height: s * 0.14 },
          ]}
        />

        {/* cheeks */}
        <View
          style={[
            styles.cheek,
            { left: s * 0.12, top: s * 0.42, backgroundColor: cheek, width: s * 0.12, height: s * 0.08 },
          ]}
        />
        <View
          style={[
            styles.cheek,
            { right: s * 0.12, top: s * 0.42, backgroundColor: cheek, width: s * 0.12, height: s * 0.08 },
          ]}
        />

        {/* mouth */}
        <View
          style={[
            mood === 'think' ? styles.mouthThink : styles.mouth,
            {
              top: s * 0.52,
              width: mood === 'think' ? s * 0.1 : s * 0.22,
              height: mood === 'think' ? s * 0.1 : s * 0.12,
            },
          ]}
        />
      </View>

      {/* waving arm */}
      <Animated.View
        style={[
          styles.arm,
          armStyle,
          {
            width: s * 0.18,
            height: s * 0.34,
            borderRadius: s * 0.1,
            right: -s * 0.02,
            top: s * 0.42,
            backgroundColor: bodyColor,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ear: {
    position: 'absolute',
    backgroundColor: colors.skyDeep,
    borderRadius: 999,
    zIndex: 0,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  belly: {
    position: 'absolute',
    bottom: '12%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  eye: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 999,
  },
  cheek: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.9,
  },
  mouth: {
    position: 'absolute',
    borderBottomWidth: 4,
    borderColor: colors.ink,
    borderRadius: 20,
  },
  mouthThink: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 999,
  },
  arm: {
    position: 'absolute',
    transformOrigin: 'top',
  },
});
