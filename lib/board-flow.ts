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
