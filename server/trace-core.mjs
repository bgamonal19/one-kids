// Whiteboard animation: the AI line drawing is revealed under the pencil the way a hand would draw it.
// The image is read on a 100×100 grid (the sketch's own coordinates): dark cells become pen strokes,
// followed one after another like a line being drawn, and coloured cells are coloured in row by row.
import jpeg from 'jpeg-js';

const GRID = 100;
const DARK = 115, MIN_DARK = 0.04, MIN_COLOR = 0.3;

function cells(image) {
  const { width, height, data } = image;
  const dark = new Uint8Array(GRID * GRID), color = new Uint8Array(GRID * GRID);
  const counts = new Uint16Array(GRID * GRID * 3);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(GRID - 1, Math.floor((y / height) * GRID));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(GRID - 1, Math.floor((x / width) * GRID));
      const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const cell = (gy * GRID + gx) * 3;
      counts[cell]++;
      if (luma < DARK) counts[cell + 1]++;
      else if (Math.max(r, g, b) - Math.min(r, g, b) > 40 && luma < 240) counts[cell + 2]++;
    }
  }
  for (let c = 0; c < GRID * GRID; c++) {
    const total = counts[c * 3] || 1;
    if (counts[c * 3 + 1] / total >= MIN_DARK) dark[c] = 1;
    else if (counts[c * 3 + 2] / total >= MIN_COLOR) color[c] = 1;
  }
  return { dark, color };
}

const steps = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const center = c => [c % GRID + 0.5, Math.floor(c / GRID) + 0.5];

/** Lines: walk along unvisited dark cells, keeping the direction when possible; jump to the nearest one when stuck. */
function penStrokes(dark) {
  const left = new Set();
  for (let c = 0; c < dark.length; c++) if (dark[c]) left.add(c);
  const strokes = [];
  let pen = [0, 0];
  while (left.size) {
    // Start the next line where the pen is, preferring the top-left like a person would.
    let start = -1, best = Infinity;
    for (const c of left) {
      const [x, y] = center(c);
      const d = Math.hypot(x - pen[0], y - pen[1]) + y * 0.15;
      if (d < best) { best = d; start = c; }
    }
    const stroke = [center(start)];
    left.delete(start);
    let at = start, dir = 0;
    for (;;) {
      let next = -1;
      for (let k = 0; k < 8 && next < 0; k++) {
        const [dx, dy] = steps[(dir + [0, 1, 7, 2, 6, 3, 5, 4][k]) % 8];
        const x = (at % GRID) + dx, y = Math.floor(at / GRID) + dy;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
        const c = y * GRID + x;
        if (left.has(c)) { next = c; dir = (dir + [0, 1, 7, 2, 6, 3, 5, 4][k]) % 8; }
      }
      if (next < 0) break;
      left.delete(next);
      stroke.push(center(next));
      at = next;
    }
    pen = stroke.at(-1);
    strokes.push(stroke);
  }
  return strokes;
}

/** Colour: each coloured patch is filled in with back-and-forth rows, patch after patch. */
function colorStrokes(color) {
  const seen = new Uint8Array(color.length);
  const strokes = [];
  for (let c = 0; c < color.length; c++) {
    if (!color[c] || seen[c]) continue;
    const patch = [];
    const queue = [c]; seen[c] = 1;
    while (queue.length) {
      const at = queue.pop(); patch.push(at);
      for (const [dx, dy] of steps.filter((_, k) => k % 2 === 0)) {
        const x = (at % GRID) + dx, y = Math.floor(at / GRID) + dy;
        if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
        const n = y * GRID + x;
        if (color[n] && !seen[n]) { seen[n] = 1; queue.push(n); }
      }
    }
    if (patch.length < 3) continue;
    const rows = new Map();
    for (const at of patch) { const y = Math.floor(at / GRID), x = at % GRID; const r = rows.get(y) ?? [GRID, -1]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); }
    const zigzag = [...rows.entries()].sort((a, b) => a[0] - b[0]).flatMap(([y, [x0, x1]], i) => i % 2 ? [[x1 + 0.9, y + 0.5], [x0 + 0.1, y + 0.5]] : [[x0 + 0.1, y + 0.5], [x1 + 0.9, y + 0.5]]);
    strokes.push(zigzag);
  }
  return strokes;
}

// Short wiggles of one or two cells are joined into the previous stroke when they are close, to keep the data small.
function merge(strokes) {
  const out = [];
  for (const stroke of strokes) {
    const last = out.at(-1);
    if (last && stroke.length < 3 && Math.hypot(stroke[0][0] - last.at(-1)[0], stroke[0][1] - last.at(-1)[1]) < 3) last.push(...stroke);
    else out.push(stroke);
  }
  return out;
}

/** Reads a JPEG (base64) and returns the strokes that reveal it: lines first, then colour. */
export function traceDrawing(base64) {
  const image = jpeg.decode(Buffer.from(base64, 'base64'), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 64 });
  const { dark, color } = cells(image);
  return { rings: merge(penStrokes(dark)), fills: colorStrokes(color) };
}
