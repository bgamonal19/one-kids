import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';

/** A yellow pencil whose tip sits at the bottom-left corner, wiggling as if it were writing. */
export function WritingPencil({ size = 34 }: { size?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(Math.PI * 2, { duration: 420, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, t]);
  // Small loops of the tip read as handwriting strokes.
  const motion = useAnimatedStyle(() => ({ transform: [
    { translateX: Math.cos(t.value) * size * 0.08 },
    { translateY: Math.sin(t.value * 2) * size * 0.06 },
    { rotate: `${Math.sin(t.value) * 4}deg` },
  ] }));
  return (
    <Animated.View pointerEvents="none" accessible={false} style={[{ width: size, height: size }, motion]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* Body runs from the tip (bottom-left) to the eraser (top-right). */}
        <Polygon points="2,38 8,26 14,32" fill="#F3D3A6" />
        <Polygon points="2,38 4.5,33 7,35.5" fill="#33414F" />
        <Polygon points="8,26 30,4 36,10 14,32" fill="#FFC857" />
        <Path d="M11 29 L33 7" stroke="#E0A634" strokeWidth={2} />
        <Rect x="29" y="1" width="8" height="8" rx="2" transform="rotate(45 33 5)" fill="#FF8F9A" />
        <Path d="M28 6 L34 12" stroke="#B8C3CC" strokeWidth={3} />
      </Svg>
    </Animated.View>
  );
}
