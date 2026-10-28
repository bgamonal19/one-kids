import { eraseDuration, createWipePlan, eraserOnPlan, contactPolygon, type WipeLeg } from '@/lib/board-wipe';
import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { BoardSheet, blockTotals, unitsBefore } from './BoardSheet';
import { ZoomView, type Zoomed } from './BoardPhotos';
import Svg, { Polygon } from 'react-native-svg';
import { useFloatingCompanion } from './FloatingCompanion';
import type { ExpressionId } from '@/lib/expressions';
import { blockSegments, type Board } from '@/lib/tutor-boards';
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
  /** A new answer was measured: the parent splits it between columns, or continues it on the next board. */
  onPlace?: (id: string, heights: number[], cols: number, maxHeight: number) => void;
  onWritten: () => void;
  onEdit?: (id: string) => void;
  /** The board is full and this part of the answer is written: time to wipe the board. */
  onBoardFull?: () => void;
  /** The eraser is wiping the board; onErased runs when it is clean. */
  erasing?: boolean;
  onErased?: () => void;
  banner?: ReactNode;
  children?: ReactNode;
};

/** One continuous surface, with readable handwriting on phones and large screens. */
export function boardLayout(width: number, windowHeight: number, wide: boolean) {
  const inset = 0;
  const inner = Math.max(200, width - 12 - 36);
  return { inner, inset, cols: 1, maxHeight: Math.round(windowHeight * 0.65), lineSize: wide ? 28 : 25 };
}

const ERASER = { w: 96, h: 44 };

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
function WipeContact({ progress, leg }: { progress: SharedValue<number>; leg: WipeLeg }) {
  const animatedProps = useAnimatedProps(() => ({ points: contactPolygon(progress.value, leg) }));
  return <AnimatedPolygon animatedProps={animatedProps} fill="#FFFFFF" />;
}

export function TutorWhiteboard({ phase, board, activeId, childLine, pace, expression, bubble, width, columnHeight, readOnly, onPlace, onWritten, onEdit, onBoardFull, erasing, onErased, banner, children }: Props) {
  useFloatingCompanion(expression, bubble, !readOnly);
  const reduced = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const wide = width >= 700;
  const layout = boardLayout(width, windowHeight, wide);
  const maxHeight = columnHeight ?? layout.maxHeight;
  const active = readOnly ? undefined : board.blocks.find(b => b.id === activeId && blockSegments(b));
  const segments = active ? blockSegments(active)! : [];
  const total = active ? blockTotals(active).total : 0;
  // This board may hold only part of the answer: writing starts where the last board stopped and ends where this one is full.
  const startAt = active ? unitsBefore(active, segments[0].from) : 0;
  const lastTo = segments.at(-1)?.to;
  const limit = active ? (lastTo === undefined ? total : unitsBefore(active, lastTo)) : 0;
  const revealKey = `${board.id}:${activeId}`;
  const [revealed, setRevealed] = useState({ key: '', count: 0 });
  const [zoomed, setZoomed] = useState<Zoomed>(null);
  // Pieces that don't fit (even photos, which take no writing time) continue on the next board after the eraser.
  const written = useEffectEvent(() => lastTo !== undefined ? onBoardFull?.() : onWritten());
  const writing = phase === 'writing' && !readOnly;
  const shown = !writing || reduced ? limit : revealed.key === revealKey ? revealed.count : startAt;
  const waiting = writing && Boolean(activeId) && !active;

  // Reveal the answer letter by letter once it has its place on the board.
  useEffect(() => {
    if (!writing || waiting || erasing) return;
    if (reduced || limit <= startAt) { written(); return; }
    let count = startAt;
    const timer = setInterval(() => {
      count++;
      setRevealed({ key: revealKey, count });
      if (count >= limit) { clearInterval(timer); written(); }
    }, pace);
    return () => clearInterval(timer);
  }, [writing, waiting, erasing, revealKey, startAt, limit, pace, reduced]);

  // Crossed passes erase the actual contact footprint; the board is kept in «Mis pizarras».
  const [surface, setSurface] = useState({ w: 0, h: 0 });
  const seed = useMemo(() => (board.id.split('').reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7) / 4294967296), [board.id]);
  const plan = useMemo(() => createWipePlan(surface.w, surface.h, seed), [surface.w, surface.h, seed]);
  const wipe = useSharedValue(0);
  const duration = eraseDuration(surface.w, surface.h);
  const erased = useEffectEvent(() => onErased?.());
  useEffect(() => {
    if (!erasing) { wipe.value = 0; return; }
    if (reduced) { erased(); return; }
    wipe.value = 0;
    wipe.value = withTiming(1, { duration, easing: Easing.linear });
    const timer = setTimeout(() => erased(), duration + 120);
    return () => clearTimeout(timer);
  }, [erasing, reduced, wipe, duration]);
  const eraser = useAnimatedStyle(() => {
    const point = eraserOnPlan(wipe.value, plan.legs);
    return { opacity: wipe.value > 0 && wipe.value < 1 ? 1 : 0, transform: [{ translateX: point.x }, { translateY: point.y }] };
  });


  return (
    <View style={s.stage}>
      <View style={s.frame}>
        <View style={[s.surface, { paddingRight: 18 + layout.inset }]}>
          {banner}
          <View testID="board-surface" style={{ minHeight: maxHeight }} onLayout={e => setSurface({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {/* Keep untouched content fully opaque during contact erasure. */}
            <Animated.View pointerEvents={erasing ? "none" : "auto"} key={board.id} testID="board-content">
              <BoardSheet board={board} width={layout.inner} cols={layout.cols} frozen={erasing} lineSize={layout.lineSize} headerInset={0}
                active={active ? { id: active.id, shown, writing: writing && !reduced } : undefined}
                thinking={phase === 'thinking' && !readOnly ? { childLine } : null}
                onZoom={setZoomed} onEdit={readOnly ? undefined : onEdit}
                onMeasured={readOnly ? undefined : (id, heights) => onPlace?.(id, heights, layout.cols, maxHeight)} />
            </Animated.View>
            {erasing && !reduced ? <View testID="board-wiping" pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={surface.w} height={surface.h}>{plan.legs.map((leg, i) => <WipeContact key={`${seed}:${i}`} progress={wipe} leg={leg} />)}</Svg>
            </View> : null}
            <Animated.View testID="mota"  pointerEvents="none" style={[s.mota, eraser]} accessibilityElementsHidden>
              <View style={s.motaWood} /><View style={s.motaFelt} />
            </Animated.View>
          </View>
          <View pointerEvents={erasing ? "none" : "auto"}>{children}</View>
        </View>
        <ZoomView zoomed={zoomed} onClose={() => setZoomed(null)} />
        <View style={s.tray}><View style={[s.marker, { backgroundColor: '#2C60AE' }]} /><View style={[s.marker, { backgroundColor: colors.coral }]} /><View style={[s.marker, { backgroundColor: colors.leafDeep }]} /><View style={s.eraser} /></View>
      </View>

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
  mota: { position: 'absolute', left: 0, top: 0, width: ERASER.w, height: ERASER.h, borderRadius: 7, overflow: 'hidden', shadowColor: '#16394D', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  motaWood: { height: 16, backgroundColor: '#B07A45' },
  motaFelt: { flex: 1, backgroundColor: '#4E5B68' },
  bubble: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2, borderWidth: 1, borderColor: '#D8E5EF' },
  bubbleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
});
