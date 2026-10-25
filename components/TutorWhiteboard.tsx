import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { KikoMascot } from './KikoMascot';
import type { ExpressionId } from '@/lib/expressions';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

/** away: beside the board · thinking/writing: at the board · turn: stepped back for the child. */
export type BoardPhase = 'away' | 'thinking' | 'writing' | 'turn';
type Props = {
  phase: BoardPhase;
  pageKey: string;
  lines: string[];
  childLine?: string;
  /** Milliseconds per written character, so the writing roughly follows the voice. */
  pace: number;
  expression: ExpressionId;
  bubble?: string;
  width: number;
  onWritten: () => void;
  children?: ReactNode;
};

export const handwritingFont = 'PatrickHand_400Regular';

export function TutorWhiteboard({ phase, pageKey, lines, childLine, pace, expression, bubble, width, onWritten, children }: Props) {
  const { state } = useFamily();
  const reduced = useReducedMotion();
  const wide = width >= 700;
  const size = wide ? 168 : 96;
  const lane = wide ? size * 0.88 : size * 0.3;
  const reach = wide ? size * 0.5 : size * 0.42;
  const total = lines.reduce((sum, line) => sum + line.length, 0);
  const [revealed, setRevealed] = useState({ key: '', count: 0 });
  const written = useEffectEvent(() => onWritten());
  const shown = phase !== 'writing' || reduced ? total : revealed.key === pageKey ? revealed.count : 0;

  // Reveal the page letter by letter while the tutor is at the board.
  useEffect(() => {
    if (phase !== 'writing') return;
    if (reduced || !total) { written(); return; }
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setRevealed({ key: pageKey, count });
      if (count >= total) { clearInterval(timer); written(); }
    }, pace);
    return () => clearInterval(timer);
  }, [phase, pageKey, total, pace, reduced]);

  const progress = useSharedValue(0);
  const scribble = useSharedValue(0);
  const atBoard = phase === 'thinking' || phase === 'writing';
  useEffect(() => {
    progress.value = reduced ? (atBoard ? 1 : 0) : withTiming(atBoard ? 1 : 0, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
  }, [atBoard, reduced, progress]);
  useEffect(() => {
    cancelAnimation(scribble);
    scribble.value = phase === 'writing' && !reduced ? withRepeat(withTiming(1, { duration: 240 }), -1, true) : withTiming(0, { duration: 150 });
    return () => cancelAnimation(scribble);
  }, [phase, reduced, scribble]);
  // Small hops make the slide read as walking; the lean faces the board while writing.
  const walker = useAnimatedStyle(() => ({ transform: [
    { translateX: -reach * progress.value },
    { translateY: -Math.abs(Math.sin(progress.value * Math.PI * 4)) * size * 0.06 },
    { rotate: `${-5 * progress.value - scribble.value * 4}deg` },
  ] }));

  let remaining = shown;
  const visible = lines.map(line => { const part = line.slice(0, Math.max(0, remaining)); remaining -= line.length; return part; });
  const cursorLine = phase === 'writing' && shown < total ? visible.findIndex((part, i) => part.length < lines[i].length) : -1;
  const lineSize = wide ? 34 : 25;

  return (
    <View style={s.stage}>
      <View style={[s.frame, { marginRight: lane }]}>
        <View style={s.surface}>
          {childLine ? <Text style={[s.child, { fontSize: lineSize * 0.72 }]} numberOfLines={3}>Tú: {childLine}</Text> : null}
          <View style={{ minHeight: size * 0.85, paddingRight: size - lane + reach * 0.6 }} accessibilityLiveRegion="polite" accessibilityLabel={lines.join('. ')}>
            {phase === 'thinking' ? <Text style={[s.line, { fontSize: lineSize, color: colors.inkMuted }]}>✎ …</Text> : visible.map((part, i) => part || i <= cursorLine ? (
              <Text key={`${pageKey}-${i}`} style={[s.line, { fontSize: lineSize, lineHeight: lineSize * 1.3 }, i === 0 && s.firstLine]}>
                {part}{i === cursorLine ? <Text style={s.cursor}> ✎</Text> : null}
              </Text>
            ) : null)}
          </View>
          {children}
        </View>
        <View style={s.tray}><View style={[s.marker, { backgroundColor: '#2C60AE' }]} /><View style={[s.marker, { backgroundColor: colors.coral }]} /><View style={[s.marker, { backgroundColor: colors.leafDeep }]} /><View style={s.eraser} /></View>
      </View>
      <Animated.View pointerEvents="none" style={[s.walker, { width: size, top: wide ? 18 : 6 }, walker]}>
        {bubble ? <View style={s.bubble}><Text style={s.bubbleText}>{bubble}</Text></View> : null}
        <KikoMascot character={state.child?.companion ?? 'bear'} age={state.child?.age ?? 8} expression={expression} size={size} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { position: 'relative', marginVertical: 12 },
  frame: { backgroundColor: '#C9D6E2', borderRadius: 22, padding: 8, paddingBottom: 0, shadowColor: '#16394D', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  surface: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, gap: 10, minHeight: 200 },
  tray: { height: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18 },
  marker: { width: 34, height: 7, borderRadius: 4 },
  eraser: { width: 40, height: 10, borderRadius: 3, backgroundColor: '#6B7C8C', marginLeft: 'auto' },
  child: { fontFamily: handwritingFont, color: '#2C60AE' },
  line: { fontFamily: handwritingFont, color: colors.ink },
  firstLine: { color: '#1F4F95' },
  cursor: { color: colors.coral },
  walker: { position: 'absolute', right: 0, alignItems: 'center' },
  bubble: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2, borderWidth: 1, borderColor: '#D8E5EF' },
  bubbleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
});
