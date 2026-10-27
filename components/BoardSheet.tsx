import { packBoard } from '@/lib/board-flow';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
            if (onPieceLayout) return <View key={i} {...measure(i)}><BoardVisualView visual={visual} drawn={steps} width={size} drawing={false} /><Text style={s.zoomHint}>🔍 Toca el dibujo para verlo en grande</Text></View>;
            return drawn >= steps && onZoom
              ? <Pressable key={i} accessibilityRole="imagebutton" accessibilityLabel="Ver el dibujo en grande" onPress={() => onZoom({ visual })}>
                <BoardVisualView visual={visual} drawn={drawn} width={size} drawing={false} />
                <Text style={s.zoomHint}>🔍 Toca el dibujo para verlo en grande</Text>
              </Pressable>
              : <View key={i}><BoardVisualView visual={visual} drawn={drawn} width={size} drawing={Boolean(writing)} /><Text style={s.zoomHint}> </Text></View>;
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
    <Text style={s.step}>Paso</Text>
    <BlockPart block={block} from={range.from} to={range.to} shown={Infinity} lineSize={lineSize} width={width} />
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
  /** Blocks without segments are measured off-screen first; the parent then places them. */
  onMeasured?: (id: string, heights: number[]) => void;
};

/** Free placement reuses gaps beside earlier answers; numbering preserves the lesson sequence. */
export function BoardSheet({ board, width, lineSize, active, thinking, headerInset = 0, onZoom, onMeasured }: Props) {
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const widths = board.blocks.map(block => {
    if (width < 620) return width;
    const illustrated = Boolean(block.visual || block.photos?.length || block.drawingLabel);
    return Math.floor(illustrated ? (width - 18) * 0.5 : (width - 18) * 0.45);
  });
  const measurementKey = (block: BoardBlock, w: number) => `${block.id}:${w}:${lineSize}:${blockRange(block).from}:${blockRange(block).to ?? 'end'}:${block.lines.join('|')}:${Boolean(block.visual)}:${block.photos?.length ?? 0}:${block.summary?.join('|') ?? ''}:${block.drawingLabel ?? ''}`;
  const items = board.blocks.flatMap((block, i) => {
    const height = measurements[measurementKey(block, widths[i])];
    return height ? [{ id: block.id, width: widths[i], height }] : [];
  });
  const rectangles = packBoard(items, width);
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
        return <View key={block.id} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width }}>
          <Text style={s.step}>Paso {index + 1}</Text>
          <BlockPart block={block} from={range.from} to={range.to} width={rect.width} lineSize={lineSize} onZoom={onZoom} shown={active?.id === block.id ? active.shown : undefined} writing={active?.id === block.id && active.writing} />
        </View>;
      })}
    </View>
    {thinking ? <View style={[s.block, { marginTop: BLOCK_GAP }]}>
      {thinking.childLine ? <Text style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {thinking.childLine}</Text> : null}
      <View style={s.lineRow}><Text style={[s.line, { fontSize: lineSize, color: colors.inkMuted }]}>…</Text><WritingPencil size={lineSize * 1.15} /></View>
    </View> : null}
    {board.blocks.map((block, i) => <Measure key={measurementKey(block, widths[i])} block={block} width={widths[i]} lineSize={lineSize} onMeasured={(id, height) => {
      const key = measurementKey(block, widths[i]);
      setMeasurements(current => current[key] === height ? current : { ...current, [key]: height });
      if (pending.some(b => b.id === id)) onMeasured?.(id, [height]);
    }} />)}
  </View>;
}

const s = StyleSheet.create({
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
