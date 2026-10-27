import { BOARD_READING_MS, BOARD_DRAWING_MS, packBoard } from '@/lib/board-flow';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { BoardVisualView, visualSteps } from './BoardVisual';
import { TapedPhotos, type Zoomed } from './BoardPhotos';
import { WritingPencil } from './WritingPencil';
import { BLOCK_GAP, PIECE_GAP, blockPieces, blockSegments, type Board, type BoardBlock } from '@/lib/tutor-boards';
import { colors, fonts } from '@/constants/theme';

const handwriting = 'PatrickHand_400Regular';
export const COLUMN_GAP = 30;
// Tracing one map branch or sketch shape takes as long as writing about a dozen letters.
export const STEP_COST = 12;

export function blockTotals(block: BoardBlock) {
  const text = block.lines.reduce((sum, line) => sum + line.length, 0);
  const steps = block.visual ? visualSteps(block.visual) : 0;
  return { text, steps, total: text + steps * STEP_COST };
}

/** Letters (and drawing steps) written before a piece: where the writing stops on a board that holds only part of an answer. */
export function unitsBefore(block: BoardBlock, piece: number) {
  const { steps } = blockTotals(block);
  return blockPieces(block).slice(0, piece).reduce((sum, p) => sum + (p.kind === 'line' ? block.lines[p.index].length : p.kind === 'visual' ? steps * STEP_COST : 0), 0);
}

type PieceProps = { block: BoardBlock; from: number; to?: number; shown?: number; writing?: boolean; lineSize: number; width: number; fit?: number; onZoom?: (zoomed: Zoomed) => void; onPieceLayout?: (index: number, height: number) => void };

/** Part of an answer: pieces `from`–`to`. `shown` letters are written so far; undefined means all of it. */
function BlockPart({ block, from, to, shown, writing, lineSize, width, fit, onZoom, onPieceLayout }: PieceProps) {
  const { text, steps, total } = blockTotals(block);
  const count = shown ?? total;
  const starts = block.lines.map((_, i) => block.lines.slice(0, i).reduce((sum, line) => sum + line.length, 0));
  const visible = block.lines.map((line, i) => line.slice(0, Math.max(0, count - starts[i])));
  const cursorLine = writing && count < text ? visible.findIndex((part, i) => part.length < block.lines[i].length) : -1;
  // Fractional while drawing, so the pencil can trace each stroke.
  const drawn = Math.min(steps, Math.max(0, (count - text) / STEP_COST));
  const visual = block.visual;
  const measure = (i: number) => onPieceLayout ? { onLayout: (e: { nativeEvent: { layout: { height: number } } }) => onPieceLayout(i, Math.ceil(e.nativeEvent.layout.height)) } : {};
  const pieces = blockPieces(block).map((piece, i) => ({ piece, i })).slice(from, to);
  return (
    <View style={s.block}>
      {pieces.map(({ piece, i }) => {
        switch (piece.kind) {
          case 'child': return <Text key={i} {...measure(i)} style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {block.childLine}</Text>;
          case 'line': {
            const part = onPieceLayout ? block.lines[piece.index] : visible[piece.index];
            if (!part && piece.index > cursorLine) return null;
            return <View key={i} {...measure(i)} style={s.lineRow}>
              <Text style={[s.line, { fontSize: lineSize, lineHeight: lineSize * 1.3 }, piece.index === 0 && s.firstLine]}>{part}</Text>
              <View style={{ width: lineSize * 1.15, height: lineSize * 1.15 }}>{piece.index === cursorLine ? <WritingPencil size={lineSize * 1.15} /> : null}</View>
            </View>;
          }
          case 'visual': {
            const size = width * (fit ?? 1);
            if (!visual || (!onPieceLayout && drawn <= 0)) return null;
            if (onPieceLayout) return <View key={i} {...measure(i)}><BoardVisualView visual={visual} drawn={steps} width={size} max={size} drawing={false} /><Text style={s.zoomHint}>🔍 Toca el dibujo para verlo en grande</Text></View>;
            return <Pressable key={i} accessibilityRole="imagebutton" accessibilityLabel="Ver el dibujo en grande" disabled={drawn < steps || !onZoom} onPress={() => onZoom?.({ visual })}>
              <BoardVisualView visual={visual} drawn={drawn} width={size} max={size} drawing={Boolean(writing)} />
              <Text style={s.zoomHint}>{drawn >= steps ? '🔍 Toca el dibujo para verlo en grande' : '✏️ Dibujando…'}</Text>
            </Pressable>;
          }
          case 'summary': return onPieceLayout || count >= total ? <View key={i} {...measure(i)} style={s.summary} accessibilityLabel={`Resumen: ${block.summary!.join('. ')}`}>
            <Text style={[s.summaryTitle, { fontSize: lineSize * 0.8 }]}>📝 Resumen</Text>
            {block.summary!.map((line, j) => <Text key={j} style={[s.summaryLine, { fontSize: lineSize * 0.66 }]}>• {line}</Text>)}
          </View> : null;
          case 'photos': return onPieceLayout || count >= text ? <View key={i} {...measure(i)}><TapedPhotos photos={block.photos ?? []} drawingLabel={block.drawingLabel} width={width} onOpen={photo => onZoom?.({ photo })} /></View> : null;
        }
      })}
    </View>
  );
}

/** Measure the complete answer at its actual width before arranging it on the surface. */
function Measure({ block, width, lineSize, onMeasured }: { block: BoardBlock; width: number; lineSize: number; onMeasured: (id: string, height: number) => void }) {
  const last = useRef(0);
  const range = blockRange(block);
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[s.measure, { width }]} onLayout={event => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (height > 0 && height !== last.current) { last.current = height; onMeasured(block.id, height); }
  }}>
    <View style={s.actions}><Text style={s.step}>Paso</Text></View>
    <BlockPart block={block} from={range.from} to={range.to} shown={Infinity} lineSize={lineSize} width={width} />
    {block.visual ? <View style={{ height: 32 }} /> : null}
  </View>;
}

function blockRange(block: BoardBlock) {
  const segments = blockSegments(block);
  return { from: segments?.length ? Math.min(...segments.map(s => s.from)) : block.start ?? 0,
    to: segments?.length ? segments.at(-1)?.to : undefined };
}

type Props = {
  board: Board;
  /** Inner width of the writing surface. */
  width: number;
  cols: number;
  lineSize: number;
  /** The block being written and how many letters of it are shown. */
  active?: { id: string; shown: number; writing: boolean };
  /** While the tutor thinks: the child's words and a pencil at the end of the current column. */
  thinking?: { childLine?: string } | null;
  /** Space kept free at the top right, where the tutor stands. */
  headerInset?: number;
  onZoom?: (zoomed: Zoomed) => void;
  onEdit?: (id: string) => void;
  /** Blocks without segments are measured off-screen first; the parent then places them. */
  onMeasured?: (id: string, heights: number[]) => void;
};

/** Free placement reuses gaps beside earlier answers; numbering preserves the lesson sequence. */
export function BoardSheet({ board, width, lineSize, active, thinking, headerInset = 0, onZoom, onEdit, onMeasured }: Props) {
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [settled, setSettled] = useState<string[]>([]);
  const [chosen, setChosen] = useState<{ id: string; turn?: string }>();
  const imageVersions = useRef(new Map(board.blocks.map(b => [b.id, b.visual?.type === 'sketch' ? b.visual.trace?.image : undefined])));
  useEffect(() => {
    for (const block of board.blocks) {
      const image = block.visual?.type === 'sketch' ? block.visual.trace?.image : undefined;
      if (image && imageVersions.current.has(block.id) && imageVersions.current.get(block.id) !== image) {
        setChosen({ id: block.id, turn: active?.id }); setSettled(current => current.filter(id => id !== block.id));
      }
      imageVersions.current.set(block.id, image);
    }
  }, [board.blocks, active?.id]);
  const focusId = (chosen?.turn === active?.id ? chosen?.id : undefined) ?? (active && !settled.includes(active.id) ? active.id : undefined);
  const focused = board.blocks.find(b => b.id === focusId);
  const preparing = focused?.visual?.type === 'sketch' && Boolean(focused.visual.illustration);
  const image = focused?.visual?.type === 'sketch' ? focused.visual.trace?.image : undefined;
  useEffect(() => {
    if (!focusId || preparing || (active?.id === focusId && active.writing)) return;
    const timer = setTimeout(() => { setSettled(current => [...current, focusId]); setChosen(undefined); }, BOARD_READING_MS + (image ? BOARD_DRAWING_MS : 0));
    return () => clearTimeout(timer);
  }, [focusId, preparing, image, active?.id, active?.writing]);
  const sizes = board.blocks.map(block => block.id === focusId
    ? { width: Math.min(width, 760), font: Math.round(lineSize * 1.2) }
    : { width: width < 340 ? width : Math.floor((width - 18) / (width >= 900 ? 3 : 2)), font: Math.max(16, Math.round(lineSize * .72)) });
  const measurementKey = (block: BoardBlock, i: number) => `${block.id}:${sizes[i].width}:${sizes[i].font}:${blockRange(block).from}:${blockRange(block).to ?? 'end'}:${block.lines.join('|')}:${Boolean(block.visual)}:${block.photos?.length ?? 0}:${block.summary?.join('|') ?? ''}:${block.drawingLabel ?? ''}`;
  const items = board.blocks.flatMap((block, i) => {
    const height = measurements[measurementKey(block, i)];
    return height ? [{ id: block.id, width: sizes[i].width, height }] : [];
  });
  const rectangles = packBoard([...items.filter(item => item.id === focusId), ...items.filter(item => item.id !== focusId)], width);
  const bottom = Math.max(0, ...rectangles.map(rect => rect.y + rect.height));
  const pending = board.blocks.filter(block => !blockSegments(block));
  return <View>
    <View style={[s.header, { paddingRight: headerInset, minHeight: headerInset ? headerInset * 0.8 : undefined }]}>
      {board.topic ? <Text style={[s.topic, { fontSize: lineSize * 1.05 }]} numberOfLines={2}>Tema: {board.topic}{board.part > 1 ? <Text style={s.part}>  (continuación {board.part})</Text> : null}</Text> : null}
    </View>
    <View style={{ position: 'relative', minHeight: bottom }}>
      {board.blocks.map((block, index) => {
        const rect = rectangles.find(p => p.id === block.id);
        if (!rect) return null;
        const range = blockRange(block);
        return <Animated.View key={block.id} layout={LinearTransition.duration(550)} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width }}>
          <View style={s.actions}><Text style={s.step}>Paso {index + 1}{block.id === focusId ? ' · En grande' : ''}</Text>{onZoom && block.id !== focusId ? <Pressable accessibilityRole="button" accessibilityLabel={`Ver paso ${index + 1} en grande`} onPress={() => { setChosen({ id: block.id, turn: active?.id }); setSettled(current => current.filter(id => id !== block.id)); }}><Text style={s.actionText}>↗ Ampliar</Text></Pressable> : null}</View>
          <BlockPart block={block} from={range.from} to={range.to} width={rect.width} lineSize={sizes[index].font} onZoom={onZoom} shown={active?.id === block.id ? active.shown : undefined} writing={active?.id === block.id && active.writing} />
          {onEdit && block.visual ? <Pressable accessibilityRole="button" accessibilityLabel={`Añadir detalles al dibujo del paso ${index + 1}`} onPress={() => onEdit(block.id)} style={s.edit}><Text style={s.actionText}>✏️ Añadir a este dibujo</Text></Pressable> : null}
        </Animated.View>;
      })}
    </View>
    {thinking ? <View style={[s.block, { marginTop: BLOCK_GAP }]}>
      {thinking.childLine ? <Text style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {thinking.childLine}</Text> : null}
      <View style={s.lineRow}><Text style={[s.line, { fontSize: lineSize, color: colors.inkMuted }]}>…</Text><WritingPencil size={lineSize * 1.15} /></View>
    </View> : null}
    {board.blocks.map((block, i) => <Measure key={measurementKey(block, i)} block={block} width={sizes[i].width} lineSize={sizes[i].font} onMeasured={(id, height) => {
      const key = measurementKey(block, i);
      setMeasurements(current => current[key] === height ? current : { ...current, [key]: height });
      if (pending.some(b => b.id === id)) onMeasured?.(id, [height]);
    }} />)}
  </View>;
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 30 },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#2C60AE', paddingVertical: 6 },
  edit: { alignSelf: 'flex-start', marginTop: 4 },
  header: { justifyContent: 'flex-start', marginBottom: 6 },
  topic: { fontFamily: handwriting, color: '#C0392B', textDecorationLine: 'underline' },
  part: { color: colors.inkMuted, textDecorationLine: 'none', fontSize: 16 },
  step: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 20, marginBottom: 4, color: '#496C98' },
  block: { gap: PIECE_GAP },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  child: { fontFamily: handwriting, color: '#2C60AE' },
  line: { fontFamily: handwriting, color: colors.ink, flex: 1 },
  firstLine: { color: '#1F4F95' },
  lineRow: { flexDirection: 'row', alignItems: 'flex-end' },
  zoomHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 4 },
  summary: { backgroundColor: '#E4F4EE', borderRadius: 12, padding: 14, gap: 4, borderWidth: 2, borderColor: colors.leaf },
  summaryTitle: { fontFamily: handwriting, color: colors.leafDeep },
  summaryLine: { fontFamily: handwriting, color: colors.ink },
});
