// Real maps for the board: country outlines from Natural Earth (world-atlas), projected onto the
// sketch's 0–100 square. The outline is traced with the pencil and the countries the tutor talks
// about are coloured and labelled on top. No AI tokens are spent on the shapes.
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const cache = {};
function countries(detail) {
  if (!cache[detail]) {
    const topo = require(`world-atlas/countries-${detail}.json`);
    cache[detail] = feature(topo, topo.objects.countries).features;
  }
  return cache[detail];
}

/** [west, south, east, north] in degrees. */
export const REGIONS = {
  world: [-170, -56, 180, 80],
  europe: [-25, 34, 45, 71],
  asia: [25, -11, 150, 56],
  africa: [-20, -36, 55, 38],
  'north-america': [-170, 7, -50, 84],
  'central-america': [-118, 6, -58, 33],
  'south-america': [-85, -57, -32, 14],
  'latin-america': [-118, -57, -32, 33],
  oceania: [110, -48, 180, 0],
  'middle-east': [24, 11, 64, 43],
};

const plain = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const aliases = { usa: 'united states of america', 'united states': 'united states of america', 'estados unidos': 'united states of america', eeuu: 'united states of america', uk: 'united kingdom', 'reino unido': 'united kingdom', 'democratic republic of the congo': 'dem rep congo', 'dr congo': 'dem rep congo', 'republic of the congo': 'congo', 'czech republic': 'czechia', 'ivory coast': 'cote d ivoire', 'south sudan': 's sudan', 'bosnia and herzegovina': 'bosnia and herz', 'central african republic': 'central african rep', 'dominican republic': 'dominican rep', 'western sahara': 'w sahara', 'north macedonia': 'macedonia', 'equatorial guinea': 'eq guinea', palestina: 'palestine' };

// Spanish (or English) country names to the English names in the atlas, through the ISO region codes.
let spanish;
function englishName(name) {
  const key = plain(name);
  if (aliases[key]) return aliases[key];
  if (!spanish) {
    spanish = new Map();
    const es = new Intl.DisplayNames('es', { type: 'region' }), en = new Intl.DisplayNames('en', { type: 'region' });
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      try { const local = es.of(code), english = en.of(code); if (local && local !== code) spanish.set(plain(local), plain(english)); } catch {}
    }
  }
  const english = spanish.get(key) ?? key;
  return aliases[english] ?? english;
}

function findCountry(list, name) {
  const wanted = englishName(name);
  return list.find(f => plain(f.properties.name) === wanted) ?? list.find(f => plain(f.properties.name).startsWith(wanted) || wanted.startsWith(plain(f.properties.name)));
}

const ringsOf = geometry => geometry.type === 'Polygon' ? geometry.coordinates : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : [];

function bounds(rings) {
  let w = 180, s = 90, e = -180, n = -90;
  for (const ring of rings) for (const [x, y] of ring) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w, s, e, n];
}

// Douglas–Peucker, so a world map stays a few thousand points.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1, dist = tolerance;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point: measure from that point.
      const d = len ? Math.abs((bx - ax) * (ay - points[i][1]) - (ax - points[i][0]) * (by - ay)) / len : Math.hypot(points[i][0] - ax, points[i][1] - ay);
      if (d > dist) { dist = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const palette = ['black', 'blue', 'red', 'green', 'orange', 'yellow', 'brown', 'purple'];
const round = v => Math.round(v * 10) / 10;

/**
 * Turns {region, countries:[{name, color, label}]} into the outline to trace and the shapes on top.
 * Returns null when nothing can be placed, so the tutor's own sketch stays.
 */
export function mapSketch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const asked = (Array.isArray(raw.countries) ? raw.countries : []).slice(0, 12).filter(c => c && typeof c.name === 'string');
  const region = typeof raw.region === 'string' ? raw.region.trim().toLowerCase() : '';
  const coarse = countries('110m');
  const found = asked.map(c => ({ ...c, feature: findCountry(coarse, c.name) })).filter(c => c.feature);
  const regionCountry = !REGIONS[region] && region ? findCountry(coarse, region) : null;
  let view = REGIONS[region];
  if (!view) {
    const focus = [...(regionCountry ? [regionCountry] : []), ...found.map(c => c.feature)];
    if (!focus.length) return null;
    const [w, s, e, n] = bounds(focus.flatMap(f => ringsOf(f.geometry)));
    const pad = Math.max(4, (e - w) * 0.35, (n - s) * 0.35);
    view = [w - pad, Math.max(-85, s - pad), e + pad, Math.min(85, n + pad)];
  }
  const [west, south, east, north] = view;
  // Equirectangular, squeezed by the latitude so countries keep their shape. The map fills the width; its height
  // follows the region (the sketch's `aspect`), so a world map isn't a thin strip in an empty square.
  const squeeze = Math.cos(((south + north) / 2) * Math.PI / 180);
  const spanX = (east - west) * squeeze, spanY = north - south;
  const scale = Math.min(98 / spanX, 120 / spanY);
  const height = spanY * scale + 2;
  const ox = 50 - (spanX * scale) / 2;
  const project = ([lon, lat]) => [round(ox + (lon - west) * squeeze * scale), round(1 + (north - lat) * scale)];
  const clamp = ([x, y]) => [Math.min(100, Math.max(0, x)), Math.min(height, Math.max(0, y))];
  const inside = ([x, y]) => x >= -0.5 && x <= 100.5 && y >= -0.5 && y <= height + 0.5;
  const wide = (east - west) > 70;
  const list = wide ? coarse : countries('50m');
  const tolerance = wide ? 0.3 : 0.22;
  const inView = f => { const [w, s, e, n] = bounds(ringsOf(f.geometry)); return e >= west && w <= east && n >= south && s <= north; };
  // Only the coastline and borders inside the frame are traced: a ring leaving the frame is cut, never dragged along its edge.
  const outline = [];
  for (const f of list.filter(inView)) for (const ring of ringsOf(f.geometry)) {
    let piece = [];
    const flush = () => {
      const points = simplify(piece, tolerance);
      const [x0, y0, x1, y1] = bounds([points]);
      if (points.length >= 2 && Math.max(x1 - x0, y1 - y0) >= 0.6) outline.push(points);
      piece = [];
    };
    for (const point of ring.map(project)) {
      const jump = piece.length && Math.abs(point[0] - piece.at(-1)[0]) > 40;
      if (!inside(point) || jump) { if (piece.length) flush(); if (!inside(point)) continue; }
      piece.push(point);
    }
    if (piece.length) flush();
  }
  if (!outline.length) return null;
  // Trace roughly left to right, like a hand going across the map.
  outline.sort((a, b) => a[0][0] - b[0][0]);
  const shapes = [];
  const labels = [];
  for (const c of found) {
    const color = palette.includes(c.color) ? c.color : 'red';
    const detailed = list === coarse ? c.feature : findCountry(list, c.feature.properties.name) ?? c.feature;
    const parts = ringsOf(detailed.geometry).map(ring => simplify(ring.map(project).map(clamp), tolerance)).filter(p => p.length >= 3);
    if (!parts.length) continue;
    for (const points of parts) shapes.push({ s: 'poly', points, color, fill: true });
    // The label goes in the middle of the country's biggest piece.
    const main = parts.reduce((a, b) => { const [ax0, ay0, ax1, ay1] = bounds([a]), [bx0, by0, bx1, by1] = bounds([b]); return (bx1 - bx0) * (by1 - by0) > (ax1 - ax0) * (ay1 - ay0) ? b : a; });
    const [x0, y0, x1, y1] = bounds([main]);
    // A small country also gets a ring so it can be found.
    if (Math.max(x1 - x0, y1 - y0) < 4) shapes.push({ s: 'circle', x: round((x0 + x1) / 2), y: round((y0 + y1) / 2), r: 3.5, color, fill: false });
    const text = typeof c.label === 'string' && c.label.trim() ? c.label.trim().slice(0, 30) : c.name.slice(0, 30);
    labels.push({ text, color, x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
  }
  // Names go on the countries when they fit; when they would overlap, a colour key goes under the map instead.
  const size = 4.2;
  const box = l => [l.x - l.text.length * size * 0.26, l.y - size * 0.6, l.x + l.text.length * size * 0.26, l.y + size * 0.6];
  const overlap = labels.some((a, i) => labels.some((b, j) => { if (j <= i) return false; const [a0, a1, a2, a3] = box(a), [b0, b1, b2, b3] = box(b); return a0 < b2 && b0 < a2 && a1 < b3 && b1 < a3; }));
  let aspect = height / 100;
  if (overlap) {
    const perRow = 2, rowHeight = 7;
    labels.forEach((l, i) => {
      const x = 4 + (i % perRow) * 50, y = height + 6 + Math.floor(i / perRow) * rowHeight;
      shapes.push({ s: 'rect', x, y: round(y - 3.2), w: 4, h: 4, color: l.color, fill: true });
      shapes.push({ s: 'text', x: round(x + 6 + l.text.length * size * 0.25), y: round(y + 0.6), text: l.text, size, color: 'black', fill: false });
    });
    aspect = (height + 4 + Math.ceil(labels.length / perRow) * rowHeight) / 100;
  } else for (const l of labels) shapes.push({ s: 'text', x: round(Math.min(92, Math.max(8, l.x))), y: round(Math.min(height - 1, Math.max(4, l.y + 1.5))), text: l.text, size, color: 'black', fill: false });
  return { trace: { rings: outline }, shapes, aspect: Math.round(aspect * 100) / 100 };
}

/** A sketch that asked for a real map gets the traced outline and its coloured countries. */
export function attachMap(visual) {
  if (visual?.type !== 'sketch' || !visual.geo) return visual;
  const { geo, ...sketch } = visual;
  const map = mapSketch(geo);
  // The tutor's own arrows and notes are kept on top of the map.
  return map ? { ...sketch, trace: map.trace, aspect: map.aspect, shapes: [...map.shapes, ...sketch.shapes.filter(s => s.s !== 'text' || !map.shapes.some(m => m.s === 'text' && m.text === s.text))] } : sketch;
}
