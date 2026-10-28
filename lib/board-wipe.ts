/** Overlapping contact rows cover the board using the actual size of the eraser. */
export function wipeRows(height: number, eraserHeight = 44) {
  'worklet';
  return Math.max(1, Math.ceil(Math.max(0, height - eraserHeight) / Math.max(1, eraserHeight - 4)) + 1);
}
export function eraseDuration(width: number, height: number) {
  return Math.min(12000, Math.max(1800, wipeRows(height) * Math.max(220, width / 2)));
}
export function eraserPoint(progress: number, width: number, height: number, eraserWidth = 96, eraserHeight = 44) {
  'worklet';
  const rows = wipeRows(height, eraserHeight);
  const t = Math.min(.999999999, Math.max(0, progress)) * rows;
  const row = Math.min(rows - 1, Math.floor(t));
  const fraction = progress >= 1 ? 1 : t - row;
  return {
    x: (row % 2 ? 1 - fraction : fraction) * Math.max(0, width - eraserWidth),
    y: Math.min(row * Math.max(1, eraserHeight - 4), Math.max(0, height - eraserHeight)),
  };
}
/** Union of the rectangles actually touched so far on one row; opacity is always 1. */
export function wipedBand(progress: number, row: number, width: number, height: number, eraserWidth = 96, eraserHeight = 44) {
  'worklet';
  const rows = wipeRows(height, eraserHeight);
  const reached = progress > 0 && progress * rows >= row;
  const fraction = Math.min(1, Math.max(0, progress * rows - row));
  const x = (row % 2 ? 1 - fraction : fraction) * Math.max(0, width - eraserWidth);
  return {
    left: row % 2 ? x : 0,
    top: Math.min(row * Math.max(1, eraserHeight - 4), Math.max(0, height - eraserHeight)),
    width: reached ? row % 2 ? width - x : Math.min(width, x + eraserWidth) : 0,
    height: Math.min(height, eraserHeight),
  };
}
