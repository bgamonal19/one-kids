import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export type KikoMood = 'happy' | 'wave' | 'think' | 'celebrate';
export type CompanionId = 'kiko' | 'nova' | 'axon';
export const COMPANIONS = {
  kiko: { name: 'Kiko', role: 'Curioso y optimista', colors: ['#73E9EE', '#159DBA'] as const, symbol: '✦' },
  nova: { name: 'Nova', role: 'Inventora de ideas', colors: ['#C4B5FD', '#7955D8'] as const, symbol: '⚡' },
  axon: { name: 'Axon', role: 'Explorador valiente', colors: ['#FFD59A', '#F18956'] as const, symbol: '★' },
};

export function KikoMascot({ mood = 'happy', size = 140, character = 'kiko', age = 8 }: {
  mood?: KikoMood; size?: number; character?: CompanionId; age?: number;
}) {
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const wave = useSharedValue(0);
  useEffect(() => {
    if (!reduced) {
      float.value = withRepeat(withSequence(withTiming(-5, { duration: 1300 }), withTiming(0, { duration: 1300 })), -1);
      blink.value = withRepeat(withSequence(withDelay(3100, withTiming(0.08, { duration: 90 })), withTiming(1, { duration: 100 })), -1);
      wave.value = withRepeat(withSequence(withTiming(mood === 'wave' || mood === 'celebrate' ? -24 : -5, { duration: 450 }), withTiming(8, { duration: 450 })), -1, true);
    }
    return () => { cancelAnimation(float); cancelAnimation(blink); cancelAnimation(wave); };
  }, [mood, reduced, float, blink, wave]);
  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const waving = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.value}deg` }] }));
  const c = COMPANIONS[character];
  return (
    <View accessible accessibilityLabel={`${c.name}, ${c.role}`} style={{ width: size, height: size * 1.15 }}>
      <View style={[s.shadow, { width: size * .68, left: size * .16, bottom: size * .02 }]} />
      <Animated.View style={[{ width: size, height: size }, floating]}>
        <View style={[s.antenna, { left: size * .48, top: size * .03, height: size * .16 }]} />
        <View style={[s.spark, { left: size * .42, width: size * .17, height: size * .17, backgroundColor: c.colors[0] }]} />
        <LinearGradient colors={c.colors} style={[s.body, { left: size * .08, top: size * .16, width: size * .84, height: size * .78, borderRadius: size * (character === 'nova' ? .26 : .36) }]}>
          <View style={[s.glint, { width: size * .32, height: size * .1 }]} />
          <View style={[s.visor, { top: size * .19, width: size * .65, height: size * .3, borderRadius: size * .13 }]}>
            <Animated.View style={[s.eyes, eyes]}>
              {[0, 1].map(i => <View key={i} style={[s.eye, { width: size * .1, height: size * .13 }]}><View style={s.reflection} /></View>)}
            </Animated.View>
            <View style={[s.smile, mood === 'think' && { width: 7, height: 7, borderRadius: 7, backgroundColor: '#A9FAFF' }]} />
          </View>
          <View style={[s.chest, { bottom: size * .07 }]}><Text style={{ color: c.colors[1], fontSize: size * .15 }}>{age >= 13 ? '⌘' : c.symbol}</Text></View>
          {character === 'axon' ? <View style={s.scarf} /> : null}
        </LinearGradient>
        <Animated.View style={[s.hand, { right: 0, top: size * .45, width: size * .14, height: size * .3, backgroundColor: c.colors[1] }, waving]} />
        <View style={[s.hand, { left: 0, top: size * .5, width: size * .13, height: size * .25, backgroundColor: c.colors[1], transform: [{ rotate: '18deg' }] }]} />
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  shadow: { position: 'absolute', height: 12, borderRadius: 100, backgroundColor: '#18335C18' },
  antenna: { position: 'absolute', width: 4, backgroundColor: '#344767' },
  spark: { position: 'absolute', borderRadius: 100, borderWidth: 3, borderColor: '#FFFFFF' },
  body: { position: 'absolute', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF99' },
  glint: { position: 'absolute', left: '15%', top: '9%', borderRadius: 100, backgroundColor: '#FFFFFF66', transform: [{ rotate: '-16deg' }] },
  visor: { position: 'absolute', backgroundColor: '#19364D', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF88' },
  eyes: { flexDirection: 'row', gap: 16 }, eye: { backgroundColor: '#B5FFFF', borderRadius: 20 },
  reflection: { width: '35%', height: '30%', borderRadius: 10, backgroundColor: '#FFFFFF', margin: 2 },
  smile: { position: 'absolute', bottom: 3, width: 14, height: 6, borderBottomWidth: 2, borderColor: '#A9FAFF', borderRadius: 10 },
  chest: { position: 'absolute', borderRadius: 12, paddingHorizontal: 8, backgroundColor: '#FFFFFFDD' },
  hand: { position: 'absolute', borderRadius: 100, borderWidth: 2, borderColor: '#FFFFFF88', transformOrigin: 'top' },
  scarf: { position: 'absolute', bottom: '29%', width: '95%', height: 8, backgroundColor: '#267F87', borderRadius: 8 },
});
