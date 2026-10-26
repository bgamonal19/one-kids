import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, SlideInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BoardSheet, blockTotals } from './BoardSheet';
import { ZoomView, type Zoomed } from './BoardPhotos';
import { KikoMascot } from './KikoMascot';
import type { ExpressionId } from '@/lib/expressions';
import type { Board } from '@/lib/tutor-boards';
import { useFamily } from '@/lib/store';
import { colors, fonts } from '@/constants/theme';

/** away: beside the board · thinking/writing: at the board · turn: stepped back for the child. */
export type BoardPhase = 'away' | 'thinking' | 'writing' | 'turn';
type Props = {
  phase: BoardPhase;
  board: Board;
  /** The block the tutor is writing now. */
  activeId?: string;
  /** What the child just said, shown while the tutor thinks. */
  childLine?: string;
  /** Milliseconds per written character, so the writing roughly follows the voice. */
  pace: number;
  expression: ExpressionId;
  bubble?: string;
  width: number;
  /** Fixed height for the columns (full screen); otherwise it follows the window. */
  columnHeight?: number;
  /** A board shown for review: nothing is written or placed. */
  readOnly?: boolean;
  /** A new answer was measured: the parent decides its column, or starts the next board. */
  onPlace?: (id: string, height: number, cols: number, maxHeight: number) => void;
  onWritten: () => void;
  banner?: ReactNode;
  children?: ReactNode;
};

/** How many columns and how tall: a teacher's board on big screens, one column on phones. */
export function boardLayout(width: number, windowHeight: number, wide: boolean) {
  const inset = wide ? 168 * 0.62 : 0;
  const inner = Math.max(200, width - 12 - 36 - inset);
  const cols = inner >= 940 ? 3 : inner >= 560 ? 2 : 1;
  const maxHeight = cols > 1 ? Math.round(Math.min(680, Math.max(360, windowHeight * 0.62))) : Math.round(Math.min(900, Math.max(440, windowHeight * 0.8)));
  const lineSize = cols === 1 ? (wide ? 32 : 25) : cols === 2 ? 27 : 25;
  return { inner, inset, cols, maxHeight, lineSize };
}

export function TutorWhiteboard({ phase, board, activeId, childLine, pace, expression, bubble, width, columnHeight, readOnly, onPlace, onWritten, banner, children }: Props) {
  const { state } = useFamily();
  const reduced = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const wide = width >= 700;
  const size = wide ? 168 : 84;
  const reach = wide ? size * 0.5 : size * 0.42;
  const layout = boardLayout(width, windowHeight, wide);
  const maxHeight = columnHeight ?? layout.maxHeight;
  const active = readOnly ? undefined : board.blocks.find(b => b.id === activeId && b.col !== undefined);
  const total = active ? blockTotals(active).total : 0;
  const [revealed, setRevealed] = useState({ key: '', count: 0 });
  const [zoomed, setZoomed] = useState<Zoomed>(null);
  const written = useEffectEvent(() => onWritten());
  const writing = phase === 'writing' && !readOnly;
  const shown = !writing || reduced ? total : revealed.key === activeId ? revealed.count : 0;
  const waiting = writing && Boolean(activeId) && !active;

  // Reveal the answer letter by letter once it has its place on the board.
  useEffect(() => {
    if (!writing || waiting) return;
    if (reduced || !total) { written(); return; }
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setRevealed({ key: activeId ?? '', count });
      if (count >= total) { clearInterval(timer); written(); }
    }, pace);
    return () => clearInterval(timer);
  }, [writing, waiting, activeId, total, pace, reduced]);

  const progress = useSharedValue(0);
  const scribble = useSharedValue(0);
  const atBoard = (phase === 'thinking' || phase === 'writing') && !readOnly;
  useEffect(() => {
    progress.value = reduced ? (atBoard ? 1 : 0) : withTiming(atBoard ? 1 : 0, { duration: 1100, easing: Easing.inOut(Easing.cubic) });
  }, [atBoard, reduced, progress]);
  useEffect(() => {
    cancelAnimation(scribble);
    scribble.value = writing && !waiting && !reduced ? withRepeat(withTiming(1, { duration: 240 }), -1, true) : withTiming(0, { duration: 150 });
    return () => cancelAnimation(scribble);
  }, [writing, waiting, reduced, scribble]);
  // Small hops make the slide read as walking; the lean faces the board while writing.
  const walker = useAnimatedStyle(() => ({ transform: [
    { translateX: -reach * progress.value },
    { translateY: -Math.abs(Math.sin(progress.value * Math.PI * 4)) * size * 0.06 },
    { rotate: `${-5 * progress.value - scribble.value * 4}deg` },
  ] }));

  return (
    <View style={s.stage}>
      <View style={s.frame}>
        {/* A full board slides up and a clean one comes in for the next part. */}
        <Animated.View key={board.id} entering={reduced || readOnly ? undefined : SlideInDown.duration(650)} style={[s.surface, { paddingRight: 18 + layout.inset }]}>
          {banner}
          <View style={layout.cols > 1 ? { minHeight: maxHeight } : undefined}>
            <BoardSheet board={board} width={layout.inner} cols={layout.cols} lineSize={layout.lineSize} headerInset={wide ? 0 : size * 1.15}
              active={active ? { id: active.id, shown, writing: writing && !reduced } : undefined}
              thinking={phase === 'thinking' && !readOnly ? { childLine } : null}
              onZoom={setZoomed}
              onMeasured={readOnly ? undefined : (id, height) => onPlace?.(id, height, layout.cols, maxHeight)} />
          </View>
          {children}
        </Animated.View>
        <ZoomView zoomed={zoomed} onClose={() => setZoomed(null)} />
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
  frame: { backgroundColor: '#C9D6E2', padding: 6, paddingBottom: 0, shadowColor: '#16394D', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4, overflow: 'hidden' },
  surface: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 18, gap: 10 },
  tray: { height: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18 },
  marker: { width: 34, height: 7, borderRadius: 4 },
  eraser: { width: 40, height: 10, borderRadius: 3, backgroundColor: '#6B7C8C', marginLeft: 'auto' },
  walker: { position: 'absolute', right: 0, alignItems: 'center' },
  bubble: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2, borderWidth: 1, borderColor: '#D8E5EF' },
  bubbleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
});
