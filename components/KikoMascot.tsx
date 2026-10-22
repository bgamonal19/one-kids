import { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { expressionFrame, expressionLabel, hasExpressions, type ExpressionId } from '@/lib/expressions';
import { COMPANIONS, isCompanionId, type CompanionId } from '@/lib/companions';

export { COMPANIONS, type CompanionId } from '@/lib/companions';
export type KikoMood = 'happy' | 'wave' | 'think' | 'celebrate';

/** Approved expression sheets are cached and selected through art-only viewports. */
export function KikoMascot({ mood = 'happy', size = 140, character = 'kiko', age = 8, animated = true, expression }: {
  mood?: KikoMood; size?: number; character?: CompanionId; age?: number; animated?: boolean; expression?: ExpressionId;
}) {
  const activeExpression = expression ?? (mood === 'wave' ? 'hello' : mood === 'happy' ? 'listen' : mood);
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(float); cancelAnimation(tilt); cancelAnimation(scale);
    float.value = 0; tilt.value = 0; scale.value = 1;
    if (!reduced && animated && activeExpression !== 'rest') {
      const amplitude = age >= 13 ? 2 : 5;
      float.value = withRepeat(withSequence(withTiming(-amplitude, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1);
      if (activeExpression === 'hello' || activeExpression === 'bye' || activeExpression === 'celebrate') {
        tilt.value = withRepeat(withSequence(withTiming(-3, { duration: 450 }), withTiming(3, { duration: 450 })), -1, true);
      }
      if (activeExpression === 'celebrate') {
        scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 450 }), withTiming(1, { duration: 450 })), -1, true);
      }
      if (activeExpression === 'think' || activeExpression === 'curious') tilt.value = withTiming(-7, { duration: 300 });
    }
    return () => { cancelAnimation(float); cancelAnimation(tilt); cancelAnimation(scale); };
  }, [age, animated, activeExpression, reduced, float, tilt, scale]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }, { rotate: `${tilt.value}deg` }, { scale: scale.value }] }));
  const id = isCompanionId(character) ? character : 'kiko';
  const companion = COMPANIONS[id];
  const frame = hasExpressions(id) ? expressionFrame(id, activeExpression) : null;
  const factor = frame ? Math.min(size / frame.width, (size * 1.12) / frame.height) : 1;
  return (
    <View accessible accessibilityLabel={`${companion.name}: ${expressionLabel(activeExpression)}`} style={{ width: size, height: size * 1.12 }}>
      <Animated.View style={[{ width: size, height: size * 1.12, alignItems: 'center', justifyContent: 'center' }, motion]}>
        {frame ? (
          <View style={{ width: frame.width * factor, height: frame.height * factor, overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFEFA' }}>
            <Image source={frame.asset} contentFit="fill" cachePolicy="memory-disk" accessible={false} style={{ position: 'absolute', left: -frame.x * factor, top: -frame.y * factor, width: frame.sheetWidth * factor, height: frame.sheetHeight * factor }} />
          </View>
        ) : <Image source={companion.asset} contentFit="contain" cachePolicy="memory-disk" transition={reduced ? 0 : 120} style={{ width: size, height: size * 1.12 }} accessible={false} />}
      </Animated.View>
    </View>
  );
}
