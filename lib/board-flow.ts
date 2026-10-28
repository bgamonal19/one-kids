/** A board is a shared surface, not fixed columns. Rectangles keep content apart. */
export type BoardRect = { id: string; x: number; y: number; width: number; height: number };
export function packBoard(items: { id: string; width: number; height: number }[], width: number, gap = 18): BoardRect[] {
  const placed: BoardRect[] = [];
  for (const item of items) {
    const w = Math.min(width, Math.max(1, item.width));
    const h = Math.max(1, item.height);
    const xs = [...new Set([0, ...placed.map(p => p.x + p.width + gap)])].sort((a, b) => a - b);
    const ys = [...new Set([0, ...placed.map(p => p.y + p.height + gap)])].sort((a, b) => a - b);
    let target: BoardRect | undefined;
    for (const y of ys) {
      for (const x of xs) {
        if (x + w > width + 0.5) continue;
        const overlaps = placed.some(p => x < p.x + p.width + gap && x + w + gap > p.x && y < p.y + p.height + gap && y + h + gap > p.y);
        if (!overlaps) { target = { id: item.id, x, y, width: w, height: h }; break; }
      }
      if (target) break;
    }
    placed.push(target ?? { id: item.id, x: 0, y: Math.max(0, ...placed.map(p => p.y + p.height + gap)), width: w, height: h });
  }
  return placed;
}

/** Follow-up buttons always belong to the current conversation. A new page is intentional. */
export function explicitNewTopic(action: string, message: string): boolean {
  return action === 'help' && /(?:cambi(?:emos|ar|a)\s+(?:de\s+)?tema|(?:otro|nuevo|nueva)\s+tema|pasemos\s+a\s+otro|empecemos\s+(?:con\s+)?otro)/i.test(message);
}

export const BOARD_READING_MS = 5000;
export const BOARD_DRAWING_MS = 11000;
/** Additions refer to an existing scene; another topic or drawing starts a separate answer. */
export function editsExistingDrawing(message: string): boolean {
  if (/(?:otro|nuevo|nueva)\s+(?:tema|dibujo|pizarra)|\btemas?\b|explicaci[oó]n|resumen/i.test(message)) return false;
  return /^(?:por favor[, ]*)?(?:agr[eé]ga(?:le)?|a[ñn][aá]de(?:le)?|pon(?:le)?|coloca|incluye|quita(?:le)?|cambia|marca|se[ñn]ala)\b/i.test(message.trim()) || /(?:dibuja|agrega|añade|pon).*(?:encima|sobre el|en el dibujo|en ese dibujo|al dibujo)/i.test(message);
}

/** A menu visit must never inherit another course from the last saved board. */
export function latestCourseBoard<T extends { courseId?: string }>(boards: T[], courseId = ''): T | undefined {
  return boards.filter(board => (board.courseId || '') === courseId).at(-1);
}
export function compactBoardSize(width: number, lineSize: number) {
  const columns = width < 300 ? 1 : width >= 900 ? 4 : width >= 600 ? 3 : 2;
  return { width: Math.floor((width - 12 * (columns - 1)) / columns), font: Math.max(12, Math.round(lineSize * .46)) };
}
