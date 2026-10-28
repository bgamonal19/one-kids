export type WipePoint = { x: number; y: number };
export type WipeLeg = { a: WipePoint; b: WipePoint; start: number; end: number };
export type WipePlan = { legs: WipeLeg[]; rows: number[]; distance: number };
export function wipeRows(height: number, eraserHeight = 44) {
  'worklet';
  return Math.max(1, Math.ceil(Math.max(0, height - eraserHeight) / Math.max(1, eraserHeight - 4)) + 1);
}
/** Shuffle covering passes; diagonal connections erase too. The seed changes on every wipe. */
export function createWipePlan(width: number, height: number, seed: number, w = 96, h = 44): WipePlan {
  let state = (seed * 2147483647) >>> 0 || 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const rows = Array.from({ length: wipeRows(height, h) }, (_, i) => i);
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
  const points: WipePoint[] = [];
  for (const row of rows) {
    const y = Math.min(row * Math.max(1, h - 4), Math.max(0, height - h));
    const reverse = random() > .5;
    points.push({ x: reverse ? Math.max(0, width - w) : 0, y }, { x: reverse ? 0 : Math.max(0, width - w), y });
  }
  let distance = 0;
  const legs = points.slice(1).map((b, i) => {
    const a = points[i], start = distance;
    distance += Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    return { a, b, start, end: distance };
  });
  return { legs: legs.map(l => ({ ...l, start: l.start / distance, end: l.end / distance })), rows, distance };
}
export function eraseDuration(width: number, height: number) {
  return Math.min(15000, Math.max(2200, wipeRows(height) * Math.max(280, width / 1.6)));
}
export function legFraction(progress: number, leg: WipeLeg) {
  'worklet';
  return Math.min(1, Math.max(0, (progress - leg.start) / Math.max(.000001, leg.end - leg.start)));
}
export function eraserOnPlan(progress: number, legs: WipeLeg[]) {
  'worklet';
  const leg = legs.find(l => progress <= l.end) ?? legs[legs.length - 1];
  if (!leg) return { x: 0, y: 0 };
  const t = legFraction(progress, leg);
  return { x: leg.a.x + (leg.b.x - leg.a.x) * t, y: leg.a.y + (leg.b.y - leg.a.y) * t };
}
/** Convex hull of the moving rectangular footprint: no opacity changes and no untouched gaps. */
export function contactPolygon(progress: number, leg: WipeLeg, w = 96, h = 44) {
  'worklet';
  if (progress <= leg.start) return '';
  const t = legFraction(progress, leg);
  const b = { x: leg.a.x + (leg.b.x - leg.a.x) * t, y: leg.a.y + (leg.b.y - leg.a.y) * t };
  const points = [leg.a, b].flatMap(p => [{ x: p.x, y: p.y }, { x: p.x + w, y: p.y }, { x: p.x + w, y: p.y + h }, { x: p.x, y: p.y + h }]).sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: WipePoint[] = [], upper: WipePoint[] = [];
  for (const p of points) {
    while (lower.length >= 2) { const a = lower[lower.length - 2], b = lower[lower.length - 1]; if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0) break; lower.pop(); }
    lower.push(p);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2) { const a = upper[upper.length - 2], b = upper[upper.length - 1]; if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 0) break; upper.pop(); }
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].map(p => `${p.x},${p.y}`).join(' ');
}
