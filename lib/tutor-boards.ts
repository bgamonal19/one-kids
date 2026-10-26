import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoardVisual, ImageSearch, TutorPhoto } from './tutor';

/** One answer the tutor wrote: it sits in one column of a board. */
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
  /** Column on the board and the height it takes there, once measured. */
  col?: number;
  height?: number;
};
/** A whiteboard for one topic, written column by column like a teacher's. A full board continues on the next part. */
export type Board = { id: string; at: string; topic: string; courseId?: string; part: number; blocks: BoardBlock[] };

export const BLOCK_GAP = 18;
const KEEP_DAYS = 14;
const MAX_BOARDS = 60;
const key = (childId: string) => `onekids.tutor-boards.v1.${childId}`;
const uid = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export function newBoard(topic: string, blocks: BoardBlock[] = [], courseId?: string, part = 1): Board {
  return { id: uid(), at: new Date().toISOString(), topic, courseId, part, blocks };
}

/** Local calendar day, so "today" follows the child's clock rather than UTC. */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function columnHeights(board: Board, cols: number) {
  const used = Array.from({ length: cols }, () => 0);
  for (const block of board.blocks) if (block.col !== undefined && block.height) used[Math.min(block.col, cols - 1)] += block.height + BLOCK_GAP;
  return used;
}

/**
 * Writes the measured block down the current column, then in the next one to the side.
 * When the last column is full the block starts the next part of the board (returned as `next`).
 */
export function placeBlock(board: Board, id: string, height: number, cols: number, maxHeight: number): { board: Board; next?: Board } {
  const block = board.blocks.find(b => b.id === id);
  if (!block) return { board };
  const used = columnHeights(board, cols);
  const placed = board.blocks.filter(b => b.col !== undefined);
  let col = placed.length ? Math.min(cols - 1, Math.max(...placed.map(b => b.col!))) : 0;
  if (used[col] && used[col] + height > maxHeight) col++;
  if (col < cols) return { board: { ...board, blocks: board.blocks.map(b => b.id === id ? { ...b, col, height } : b) } };
  const rest = board.blocks.filter(b => b.id !== id);
  return { board: { ...board, blocks: rest }, next: newBoard(board.topic, [{ ...block, col: 0, height }], board.courseId, board.part + 1) };
}

/** Saved boards, newest last; a board written again replaces its older copy. */
export function keepBoard(boards: Board[], board: Board): Board[] {
  if (!board.blocks.some(b => b.reply)) return boards;
  // AI pictures are large data URLs: the device keeps the board without them.
  const light = { ...board, blocks: board.blocks.map(({ drawingLabel: _d, ...b }) => ({ ...b, photos: b.photos?.filter(p => !p.generated) })) };
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
