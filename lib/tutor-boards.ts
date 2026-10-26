import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoardVisual, ImageSearch, TutorPhoto } from './tutor';

/** Where part of an answer sits: a column and the pieces `from`–`to` (to the end when `to` is missing). */
export type Segment = { col: number; from: number; to?: number; height: number; /** A drawing shrunk to fill the space left in the column. */ fit?: number };

/** One answer the tutor wrote. A long answer can run down one column and continue in the next, or on the next board. */
export type BoardBlock = {
  id: string;
  at: string;
  childLine?: string;
  lines: string[];
  reply: string;
  visual?: BoardVisual | null;
  images?: ImageSearch[];
  photos?: TutorPhoto[];
  summary?: string[];
  /** Set while the AI picture is being made. Never saved. */
  drawingLabel?: string;
  /** First piece on this board, when the answer started on the previous one. */
  start?: number;
  /** Measured and placed parts; missing while the answer is being measured. */
  segments?: Segment[];
  /** Boards saved before segments existed. */
  col?: number;
  height?: number;
};
/** A whiteboard for one topic, written column by column like a teacher's. A full board continues on the next part of the same chain. */
export type Board = { id: string; at: string; topic: string; courseId?: string; part: number; chain?: string; blocks: BoardBlock[] };

/** The pieces an answer is written in, in order: who asked, each line, the drawing, the summary, then photos (they can arrive later). */
export type Piece = { kind: 'child' } | { kind: 'line'; index: number } | { kind: 'visual' } | { kind: 'summary' } | { kind: 'photos' };
export function blockPieces(block: BoardBlock): Piece[] {
  return [
    ...(block.childLine ? [{ kind: 'child' as const }] : []),
    ...block.lines.map((_, index) => ({ kind: 'line' as const, index })),
    ...(block.visual ? [{ kind: 'visual' as const }] : []),
    ...(block.summary?.length ? [{ kind: 'summary' as const }] : []),
    ...(block.photos?.length || block.drawingLabel ? [{ kind: 'photos' as const }] : []),
  ];
}

export const BLOCK_GAP = 18;
export const PIECE_GAP = 8;
/** A drawing may shrink to this share of its size to use the space left in a column. */
const MIN_FIT = 0.55;
const KEEP_DAYS = 14;
const MAX_BOARDS = 60;
const key = (childId: string) => `onekids.tutor-boards.v1.${childId}`;
const uid = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export function newBoard(topic: string, blocks: BoardBlock[] = [], courseId?: string, part = 1, chain?: string): Board {
  const id = uid();
  return { id, at: new Date().toISOString(), topic, courseId, part, chain: chain ?? id, blocks };
}

/** Local calendar day, so "today" follows the child's clock rather than UTC. */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Segments of a block, including boards saved before segments existed. */
export function blockSegments(block: BoardBlock): Segment[] | undefined {
  if (block.segments) return block.segments;
  return block.col !== undefined ? [{ col: block.col, from: block.start ?? 0, height: block.height ?? 0 }] : undefined;
}

export function columnHeights(board: Board, cols: number) {
  const used = Array.from({ length: cols }, () => 0);
  for (const block of board.blocks) for (const seg of blockSegments(block) ?? []) {
    const col = Math.min(seg.col, cols - 1);
    used[col] += (used[col] ? BLOCK_GAP : 0) + seg.height;
  }
  return used;
}

/**
 * Writes the measured pieces down the current column, line by line, and carries on in the next column so the
 * board fills up with no gaps. A drawing shrinks a little to use the space left. When the last column is full
 * the rest of the answer starts the next board of the chain (`next`).
 */
export function placeBlock(board: Board, id: string, heights: number[], cols: number, maxHeight: number): { board: Board; next?: Board } {
  const block = board.blocks.find(b => b.id === id);
  if (!block) return { board };
  const pieces = blockPieces(block);
  const used = columnHeights(board, cols);
  const placedCols = board.blocks.flatMap(b => (blockSegments(b) ?? []).map(seg => seg.col));
  let col = placedCols.length ? Math.min(cols - 1, Math.max(...placedCols)) : 0;
  const segments: Segment[] = [];
  let seg: Segment | null = null;
  let overflow = -1;
  for (let i = block.start ?? 0; i < pieces.length; i++) {
    let height = heights[i] ?? 0;
    // Who asked stays with the first line of the answer.
    const keep = pieces[i].kind === 'child' && i + 1 < pieces.length ? PIECE_GAP + (heights[i + 1] ?? 0) : 0;
    const gap = () => (seg ? PIECE_GAP : used[col] ? BLOCK_GAP : 0);
    let fit: number | undefined;
    if (used[col] && used[col] + gap() + height + keep > maxHeight) {
      const room = maxHeight - used[col] - gap();
      if (pieces[i].kind === 'visual' && room >= height * MIN_FIT) { fit = room / height; height = room; }
      else {
        if (seg) { seg.to = i; segments.push(seg); seg = null; }
        if (++col >= cols) { overflow = i; break; }
      }
    }
    // A drawing taller than a whole column shrinks to fit it.
    if (!used[col] && !seg && pieces[i].kind === 'visual' && height > maxHeight) { fit = maxHeight / height; height = maxHeight; }
    if (!seg) seg = { col, from: i, height: 0 };
    used[col] += gap() + height;
    seg.height += (seg.height ? PIECE_GAP : 0) + height;
    if (fit) seg.fit = fit;
  }
  if (seg) segments.push(seg);
  const placed = segments.length ? { ...block, segments } : null;
  const rest = board.blocks.filter(b => b.id !== id);
  const here = { ...board, blocks: placed ? board.blocks.map(b => b.id === id ? placed : b) : rest };
  if (overflow < 0) return { board: here };
  const { segments: _s, col: _c, height: _h, ...continued } = block;
  return { board: here, next: newBoard(board.topic, [{ ...continued, start: overflow }], board.courseId, board.part + 1, board.chain ?? board.id) };
}

/** The latest board of a chain, so continuing an old board writes after its last part. */
export function latestOfChain(boards: Board[], board: Board): Board {
  const chain = board.chain ?? board.id;
  return boards.filter(b => (b.chain ?? b.id) === chain).sort((a, b) => a.part - b.part).at(-1) ?? board;
}

/** Saved boards, newest last; a board written again replaces its older copy. */
export function keepBoard(boards: Board[], board: Board): Board[] {
  if (!board.blocks.some(b => b.reply)) return boards;
  // AI pictures are large data URLs: the device keeps the board without them.
  const light = { ...board, blocks: board.blocks.map(({ drawingLabel: _d, ...b }) => ({ ...b, photos: b.photos?.filter(p => !p.generated) })).filter(b => b.segments || b.col !== undefined) };
  const next = [...boards.filter(b => b.id !== board.id), light];
  const days = new Set([...new Set(next.map(b => dayKey(new Date(b.at))))].sort().reverse().slice(0, KEEP_DAYS));
  return next.filter(b => days.has(dayKey(new Date(b.at)))).slice(-MAX_BOARDS);
}

export async function loadBoards(childId: string): Promise<Board[]> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(key(childId))) || '[]');
    return Array.isArray(parsed) ? parsed.filter(b => b && typeof b.id === 'string' && Array.isArray(b.blocks)) : [];
  } catch { return []; }
}

export async function saveBoards(childId: string, boards: Board[]) {
  try { await AsyncStorage.setItem(key(childId), JSON.stringify(boards)); } catch { /* boards are a convenience; never block the lesson */ }
}

export function dayLabel(day: string, today = dayKey()) {
  if (day === today) return 'Hoy';
  const [y, m, d] = day.split('-').map(Number);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (day === dayKey(yesterday)) return 'Ayer';
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}
