export const ERASE_DURATION_MS = 2800;
export const ERASE_ROWS = 6;
/** White cover follows the eraser across alternating rows. */
export function wipedBand(progress: number, row: number, width: number, height: number) {
  'worklet';
  const fraction = Math.min(1, Math.max(0, progress * ERASE_ROWS - row));
  const covered = width * fraction;
  return { left: row % 2 ? width - covered : 0, top: row * height / ERASE_ROWS, width: covered, height: height / ERASE_ROWS + 1 };
}
export function eraserPoint(progress: number, width: number, height: number, eraserWidth: number, eraserHeight: number) {
  'worklet';
  const t = Math.min(.999999, Math.max(0, progress));
  const row = Math.floor(t * ERASE_ROWS);
  const fraction = t * ERASE_ROWS - row;
  return { x: (row % 2 ? 1 - fraction : fraction) * Math.max(0, width - eraserWidth), y: Math.max(0, (row + .5) * height / ERASE_ROWS - eraserHeight / 2) };
}
