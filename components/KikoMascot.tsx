import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { expressionFrame, expressionLabel, hasExpressions, type ExpressionId } from '@/lib/expressions';
import { COMPANIONS, isCompanionId, type CompanionId } from '@/lib/companions';

export { COMPANIONS, type CompanionId } from '@/lib/companions';
export type KikoMood = 'happy' | 'wave' | 'think' | 'celebrate';

/** Alpha-cutout artwork floats independently of its grounded, breathing shadow. */
export function KikoMascot({ mood = 'happy', size = 140, character = 'bear', age = 8, animated = true, expression }: {
  mood?: KikoMood; size?: number; character?: CompanionId; age?: number; animated?: boolean; expression?: ExpressionId;
}) {
  const id = isCompanionId(character) ? character : 'bear';
  const companion = COMPANIONS[id];
  const activeExpression = expression ?? (mood === 'wave' ? 'hello' : mood === 'happy' ? 'listen' : mood);
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);
  const lean = useSharedValue(0);
  const lift = useSharedValue(0);
  const motionEnabled = animated && !reduced && activeExpression !== 'rest';
  const amplitude = Math.min(10, size * (age >= 13 ? 0.025 : 0.038));

  // One periodic phase keeps position and velocity continuous at every loop.
  // Emotion changes never restart the idle loop or snap the character to zero.
  useEffect(() => {
    cancelAnimation(phase);
    if (motionEnabled) {
      phase.value = 0;
      phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 5400, easing: Easing.linear }), -1, false);
    } else phase.value = 0;
    return () => cancelAnimation(phase);
  }, [motionEnabled, phase]);

  useEffect(() => {
    cancelAnimation(lean); cancelAnimation(lift);
    const targetLean = activeExpression === 'think' ? -2.4 : activeExpression === 'curious' ? 1.8 : 0;
    const targetLift = activeExpression === 'celebrate' ? -size * 0.025 : 0;
    if (motionEnabled) {
      lean.value = withSpring(targetLean, { damping: 19, stiffness: 85 });
      lift.value = withSpring(targetLift, { damping: 17, stiffness: 70 });
    } else { lean.value = 0; lift.value = 0; }
    return () => { cancelAnimation(lean); cancelAnimation(lift); };
  }, [activeExpression, motionEnabled, size, lean, lift]);

  const motion = useAnimatedStyle(() => {
    const bob = motionEnabled ? Math.sin(phase.value) : 0;
    const sway = motionEnabled ? Math.sin(phase.value * 2) : 0;
    const breath = motionEnabled ? Math.sin(phase.value + 0.7) * 0.003 : 0;
    return { transform: [
      { translateY: motionEnabled ? -size * 0.035 + bob * amplitude + lift.value : 0 },
      { translateX: sway * amplitude * 0.22 },
      { rotate: `${lean.value + sway * 0.75}deg` },
      { scaleX: 1 + breath }, { scaleY: 1 - breath * 0.6 },
    ] };
  });
  const shadow = useAnimatedStyle(() => {
    const distance = motionEnabled ? (Math.sin(phase.value) + 1) / 2 : 0.5;
    return { opacity: 0.1 + distance * 0.06, transform: [{ scaleX: 0.85 + distance * 0.16 }, { scaleY: 0.065 + distance * 0.012 }] };
  });
  const frame = hasExpressions(id) ? expressionFrame(id, activeExpression) : null;
  // Reserve air below the feet and around the cutout; nothing clips the float.
  const factor = frame ? Math.min(size / frame.width, size / frame.height) : 1;
  return (
    <View accessible accessibilityLabel={`${companion.name}: ${expressionLabel(activeExpression)}`} style={{ width: size, height: size * 1.12 }}>
      {animated ? <Animated.View pointerEvents="none" style={[s.shadow, { width: size * 0.47, height: size * 0.47, left: size * 0.265, bottom: -size * 0.18 }, shadow]}><View style={s.shadowMiddle}><View style={s.shadowCore} /></View></Animated.View> : null}
      <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, motion]}>
        {frame ? (
          <Animated.View key={`${id}-${activeExpression}`} entering={reduced || !animated ? undefined : FadeIn.duration(180)} style={{ width: frame.width * factor, height: frame.height * factor, overflow: 'hidden' }}>
            <Image source={frame.asset} contentFit="fill" cachePolicy="memory-disk" accessible={false} style={{ position: 'absolute', left: -frame.x * factor, top: -frame.y * factor, width: frame.sheetWidth * factor, height: frame.sheetHeight * factor }} />
          </Animated.View>
        ) : <Image source={companion.asset} contentFit="contain" cachePolicy="memory-disk" transition={reduced ? 0 : 180} style={{ width: size, height: size }} accessible={false} />}
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  shadow: { position: 'absolute', borderRadius: 999, backgroundColor: '#16394D40' },
  shadowMiddle: { position: 'absolute', top: '8%', left: '8%', width: '84%', height: '84%', borderRadius: 999, backgroundColor: '#16394D60' },
  shadowCore: { position: 'absolute', top: '14%', left: '14%', width: '72%', height: '72%', borderRadius: 999, backgroundColor: '#16394D80' },
});
