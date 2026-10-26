import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BoardVisualView, visualSteps } from './BoardVisual';
import { TapedPhotos, type Zoomed } from './BoardPhotos';
import { WritingPencil } from './WritingPencil';
import { BLOCK_GAP, type Board, type BoardBlock } from '@/lib/tutor-boards';
import { colors, fonts } from '@/constants/theme';

const handwriting = 'PatrickHand_400Regular';
export const COLUMN_GAP = 30;
// Drawing a map branch or sketch shape takes as long as writing a few letters.
export const STEP_COST = 8;

export function blockTotals(block: BoardBlock) {
  const text = block.lines.reduce((sum, line) => sum + line.length, 0);
  const steps = block.visual ? visualSteps(block.visual) : 0;
  return { text, steps, total: text + steps * STEP_COST };
}

/** One answer on the board. `shown` letters are written so far; undefined means all of it. */
function BlockView({ block, shown, writing, lineSize, width, onZoom }: { block: BoardBlock; shown?: number; writing?: boolean; lineSize: number; width: number; onZoom?: (zoomed: Zoomed) => void }) {
  const { text, steps, total } = blockTotals(block);
  const count = shown ?? total;
  const starts = block.lines.map((_, i) => block.lines.slice(0, i).reduce((sum, line) => sum + line.length, 0));
  const visible = block.lines.map((line, i) => line.slice(0, Math.max(0, count - starts[i])));
  const cursorLine = writing && count < text ? visible.findIndex((part, i) => part.length < block.lines[i].length) : -1;
  const drawn = Math.min(steps, Math.max(0, Math.ceil((count - text) / STEP_COST)));
  const visual = block.visual;
  return (
    <View style={s.block} accessibilityLabel={block.lines.join('. ')}>
      {block.childLine ? <Text style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {block.childLine}</Text> : null}
      {visible.map((part, i) => part || i <= cursorLine ? (
        <View key={i} style={s.lineRow}>
          <Text style={[s.line, { fontSize: lineSize, lineHeight: lineSize * 1.3 }, i === 0 && s.firstLine]}>{part}</Text>
          {i === cursorLine ? <WritingPencil size={lineSize * 1.15} /> : null}
        </View>
      ) : null)}
      {visual && drawn > 0 ? (drawn >= steps && onZoom
        ? <Pressable accessibilityRole="imagebutton" accessibilityLabel="Ver el dibujo en grande" onPress={() => onZoom({ visual })}>
          <BoardVisualView visual={visual} drawn={drawn} width={width} drawing={false} />
          <Text style={s.zoomHint}>🔍 Toca el dibujo para verlo en grande</Text>
        </Pressable>
        : <BoardVisualView visual={visual} drawn={drawn} width={width} drawing={Boolean(writing)} />) : null}
      {(block.photos?.length || block.drawingLabel) && count >= text ? <TapedPhotos photos={block.photos ?? []} drawingLabel={block.drawingLabel} width={width} onOpen={photo => onZoom?.({ photo })} /> : null}
      {block.summary?.length && count >= total ? <View style={s.summary} accessibilityLabel={`Resumen: ${block.summary.join('. ')}`}>
        <Text style={[s.summaryTitle, { fontSize: lineSize * 0.8 }]}>📝 Resumen</Text>
        {block.summary.map((line, i) => <Text key={i} style={[s.summaryLine, { fontSize: lineSize * 0.66 }]}>• {line}</Text>)}
      </View> : null}
    </View>
  );
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
  /** Blocks without a column are measured off-screen first; the parent then places them. */
  onMeasured?: (id: string, height: number) => void;
};

/** The writing on a board: the topic's title, then answers down each column and on to the next, like a teacher. */
export function BoardSheet({ board, width, cols, lineSize, active, thinking, headerInset = 0, onZoom, onMeasured }: Props) {
  const colWidth = Math.max(160, (width - (cols - 1) * COLUMN_GAP) / cols);
  const placed = board.blocks.filter(b => b.col !== undefined || !onMeasured);
  const current = Math.min(cols - 1, Math.max(0, ...placed.map(b => b.col ?? cols - 1)));
  const columns = Array.from({ length: cols }, (_, i) => placed.filter(b => Math.min(cols - 1, b.col ?? cols - 1) === i));
  const pending = onMeasured ? board.blocks.filter(b => b.col === undefined) : [];
  return (
    <View>
      <View style={[s.header, { paddingRight: headerInset, minHeight: headerInset ? headerInset * 0.8 : undefined }]}>
        {board.topic ? <Text style={[s.topic, { fontSize: lineSize * 1.05 }]} numberOfLines={2}>
          Tema: {board.topic}{board.part > 1 ? <Text style={s.part}>  (pizarra {board.part})</Text> : null}
        </Text> : null}
      </View>
      <View style={s.columns}>
        {columns.map((blocks, i) => <View key={i} style={[s.column, { width: i > 0 ? colWidth + COLUMN_GAP / 2 : colWidth }, i > 0 && s.divider]}>
          {blocks.map(block => <BlockView key={block.id} block={block} lineSize={lineSize} width={colWidth} onZoom={onZoom}
            shown={active?.id === block.id ? active.shown : undefined} writing={active?.id === block.id && active.writing} />)}
          {thinking && i === current ? <View style={s.block}>
            {thinking.childLine ? <Text style={[s.child, { fontSize: lineSize * 0.7 }]} numberOfLines={3}>Tú: {thinking.childLine}</Text> : null}
            <View style={s.lineRow}><Text style={[s.line, { fontSize: lineSize, color: colors.inkMuted }]}>…</Text><WritingPencil size={lineSize * 1.15} /></View>
          </View> : null}
        </View>)}
      </View>
      {pending.map(block => <View key={block.id} pointerEvents="none" style={[s.measure, { width: colWidth }]} onLayout={e => onMeasured?.(block.id, Math.ceil(e.nativeEvent.layout.height))}>
        <BlockView block={block} lineSize={lineSize} width={colWidth} />
      </View>)}
    </View>
  );
}

const s = StyleSheet.create({
  header: { justifyContent: 'flex-start', marginBottom: 6 },
  topic: { fontFamily: handwriting, color: '#C0392B', textDecorationLine: 'underline' },
  part: { color: colors.inkMuted, textDecorationLine: 'none', fontSize: 16 },
  columns: { flexDirection: 'row', gap: COLUMN_GAP / 2 },
  column: { gap: BLOCK_GAP },
  divider: { borderLeftWidth: 2, borderLeftColor: '#E1E8EF', paddingLeft: COLUMN_GAP / 2 - 2, marginLeft: 0 },
  block: { gap: 8 },
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
