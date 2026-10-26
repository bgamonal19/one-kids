import { useRef } from 'react';
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
              {piece.index === cursorLine ? <WritingPencil size={lineSize * 1.15} /> : null}
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

/** Measures every piece of an answer off-screen, so the board can split it between columns. */
function Measure({ block, width, lineSize, onMeasured }: { block: BoardBlock; width: number; lineSize: number; onMeasured: (id: string, heights: number[]) => void }) {
  const count = blockPieces(block).length;
  const from = block.start ?? 0;
  const heights = useRef<number[]>([]);
  const sent = useRef(false);
  const onPieceLayout = (i: number, height: number) => {
    heights.current[i] = height;
    if (!sent.current && Array.from({ length: count - from }, (_, k) => heights.current[from + k]).every(h => h !== undefined)) {
      sent.current = true;
      onMeasured(block.id, Array.from({ length: count }, (_, k) => heights.current[k] ?? 0));
    }
  };
  return <View pointerEvents="none" style={[s.measure, { width }]}>
    <BlockPart block={block} from={from} lineSize={lineSize} width={width} onPieceLayout={onPieceLayout} />
  </View>;
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

/** The writing on a board: the topic's title, then answers down each column and on to the next, like a teacher. */
export function BoardSheet({ board, width, cols, lineSize, active, thinking, headerInset = 0, onZoom, onMeasured }: Props) {
  const colWidth = Math.max(160, (width - (cols - 1) * COLUMN_GAP) / cols);
  // Old boards without measurements go in the last column.
  const parts = board.blocks.flatMap(block => (blockSegments(block) ?? (onMeasured ? [] : [{ col: cols - 1, from: block.start ?? 0, height: 0 }])).map(seg => ({ block, seg: { ...seg, col: Math.min(cols - 1, seg.col) } })));
  const current = Math.max(0, ...parts.map(p => p.seg.col));
  const pending = onMeasured ? board.blocks.filter(b => !blockSegments(b)) : [];
  return (
    <View>
      <View style={[s.header, { paddingRight: headerInset, minHeight: headerInset ? headerInset * 0.8 : undefined }]}>
        {board.topic ? <Text style={[s.topic, { fontSize: lineSize * 1.05 }]} numberOfLines={2}>
          Tema: {board.topic}{board.part > 1 ? <Text style={s.part}>  (pizarra {board.part})</Text> : null}
        </Text> : null}
      </View>
      <View style={s.columns}>
        {Array.from({ length: cols }, (_, i) => <View key={i} style={[s.column, { width: i > 0 ? colWidth + COLUMN_GAP / 2 : colWidth }, i > 0 && s.divider]}>
          {parts.filter(p => p.seg.col === i).map(({ block, seg }) => <BlockPart key={`${block.id}-${seg.from}`} block={block} from={seg.from} to={seg.to} fit={seg.fit} lineSize={lineSize} width={colWidth} onZoom={onZoom}
            shown={active?.id === block.id ? active.shown : undefined} writing={active?.id === block.id && active.writing} />)}
          {thinking && i === current ? <View style={s.block}>
            {thinking.childLine ? <Text style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {thinking.childLine}</Text> : null}
            <View style={s.lineRow}><Text style={[s.line, { fontSize: lineSize, color: colors.inkMuted }]}>…</Text><WritingPencil size={lineSize * 1.15} /></View>
          </View> : null}
        </View>)}
      </View>
      {pending.map(block => <Measure key={`${block.id}-${block.start ?? 0}`} block={block} width={colWidth} lineSize={lineSize} onMeasured={onMeasured!} />)}
    </View>
  );
}

const s = StyleSheet.create({
  header: { justifyContent: 'flex-start', marginBottom: 6 },
  topic: { fontFamily: handwriting, color: '#C0392B', textDecorationLine: 'underline' },
  part: { color: colors.inkMuted, textDecorationLine: 'none', fontSize: 16 },
  columns: { flexDirection: 'row', gap: COLUMN_GAP / 2 },
  column: { gap: BLOCK_GAP },
  divider: { borderLeftWidth: 2, borderLeftColor: '#E1E8EF', paddingLeft: COLUMN_GAP / 2 - 2 },
  block: { gap: PIECE_GAP },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  child: { fontFamily: handwriting, color: '#2C60AE' },
  line: { fontFamily: handwriting, color: colors.ink },
  firstLine: { color: '#1F4F95' },
  lineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  zoomHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 4 },
  summary: { backgroundColor: '#E4F4EE', borderRadius: 12, padding: 14, gap: 4, borderWidth: 2, borderColor: colors.leaf },
  summaryTitle: { fontFamily: handwriting, color: colors.leafDeep },
  summaryLine: { fontFamily: handwriting, color: colors.ink },
});
