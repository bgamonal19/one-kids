import { useEffect, useId, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Image as SvgImage, Line, Mask, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { WritingPencil } from './WritingPencil';
import type { BoardVisual as Visual, SketchColor, SketchShape, SketchTrace } from '@/lib/tutor';
import { colors } from '@/constants/theme';

const handwriting = 'PatrickHand_400Regular';
const ink: Record<SketchColor, string> = { black: '#1F2A36', blue: '#2C60AE', red: '#E2553A', green: '#23935F', orange: '#F08A24', yellow: '#E9B824', brown: '#8A5A36', purple: '#7B4FC2' };
const branchColors = ['#2C60AE', '#E2553A', '#23935F', '#7B4FC2', '#F08A24', '#1A8FBF'];

/** A traced map outline takes as long to draw as this many shapes. */
const TRACE_STEPS = 24;
/** How long the pencil takes to draw an AI line drawing, which arrives after the reply. */
export const DRAWING_MS = 11000;
const lineTrace = (visual: Visual) => visual.type === 'sketch' && visual.trace && !visual.trace.image ? visual.trace : null;

/** Each map branch or sketch shape is one drawing step; a map outline counts as several. */
export function visualSteps(visual: Visual) {
  return visual.type === 'map' ? visual.branches.length + 1 : visual.illustration || visual.trace?.image ? 1 : Math.max(1, visual.shapes.length + (lineTrace(visual) ? TRACE_STEPS : 0));
}

function mapLayout(visual: Extract<Visual, { type: 'map' }>) {
  const n = visual.branches.length;
  return visual.branches.map((branch, i) => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    const w = Math.min(70, branch.label.length * 3.6 + 12);
    const x = Math.min(200 - w / 2 - 2, Math.max(w / 2 + 2, 100 + Math.cos(angle) * 76));
    const y = 64 + Math.sin(angle) * 44;
    return { ...branch, x, y, w, color: branchColors[i % branchColors.length] };
  });
}

type Point = [number, number];
const oval = (x: number, y: number, rx: number, ry: number): Point[] => Array.from({ length: 33 }, (_, i) => { const a = -Math.PI / 2 + (i / 32) * Math.PI * 2; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });

/** The path the pencil follows to draw a shape, the way a hand would. */
function strokePath(shape: SketchShape): Point[] {
  switch (shape.s) {
    case 'circle': return oval(shape.x, shape.y, shape.r, shape.r);
    case 'ellipse': return oval(shape.x, shape.y, shape.rx, shape.ry);
    case 'rect': return [[shape.x, shape.y], [shape.x + shape.w, shape.y], [shape.x + shape.w, shape.y + shape.h], [shape.x, shape.y + shape.h], [shape.x, shape.y]];
    case 'line': return [[shape.x1, shape.y1], [shape.x2, shape.y2]];
    case 'poly': return shape.open ? shape.points : [...shape.points, shape.points[0]];
    case 'text': return [[shape.x - shape.text.length * shape.size * 0.25, shape.y], [shape.x + shape.text.length * shape.size * 0.25, shape.y]];
  }
}

/** The first `part` (0–1) of a path, measured along its length. */
function partOf(path: Point[], part: number): Point[] {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let left = lengths.reduce((a, b) => a + b, 0) * part;
  const out: Point[] = [path[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (left >= lengths[i]) { out.push(path[i + 1]); left -= lengths[i]; continue; }
    const t = lengths[i] ? left / lengths[i] : 0;
    out.push([path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]);
    break;
  }
  return out;
}

/** The strokes drawn after `part` (0–1) of their total length: the finished ones, the one in progress and the pencil tip. */
function traceUpTo(strokes: Point[][], part: number) {
  const lengths = strokes.map(stroke => stroke.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - stroke[i][0], p[1] - stroke[i][1]), 0) + 0.5);
  let left = lengths.reduce((a, b) => a + b, 0) * Math.min(1, part);
  let done = 0;
  while (done < strokes.length && left >= lengths[done]) left -= lengths[done++];
  const current = done < strokes.length ? partOf(strokes[done], left / lengths[done]) : null;
  const tip = current?.at(-1) ?? strokes[done - 1]?.at(-1) ?? [50, 50];
  return { done, current, tip };
}
const pathOf = (strokes: Point[][]) => strokes.map(stroke => `M${stroke.map(p => p.join(' ')).join('L')}`).join('');

/** Time-driven progress (0–1) for a drawing that arrives after the reply; null when it shows complete. */
function useDrawingClock(trace: SketchTrace | undefined) {
  const image = trace?.image;
  // Only a drawing that arrives while the board is open is animated; saved boards show it finished.
  const [initialImage] = useState(image);
  const arrives = Boolean(image && image !== initialImage);
  const [clock, setClock] = useState<{ image?: string; part: number } | null>(null);
  useEffect(() => {
    if (!arrives || !image) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const part = (Date.now() - start) / DRAWING_MS;
      setClock(part >= 1 ? { image, part: 1 } : { image, part });
      if (part >= 1) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [arrives, image]);
  return !image || !arrives ? null : clock?.image === image ? (clock.part >= 1 ? null : clock.part) : 0;
}

/** A shape still being drawn: the stroke so far, or the letters written so far. */
function PartialShape({ shape, part, onPhoto }: { shape: SketchShape; part: number; onPhoto?: boolean }) {
  const stroke = ink[shape.color];
  if (shape.s === 'text') return <Label x={shape.x} y={shape.y} size={shape.size} color={stroke} text={shape.text.slice(0, Math.max(1, Math.ceil(shape.text.length * part)))} halo={onPhoto} />;
  return <Polyline points={partOf(strokePath(shape), part).map(p => p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={onPhoto ? 1.8 : 1.2} strokeLinecap="round" strokeLinejoin="round" />;
}

// On a photo, lines are thicker and words get a white halo so they read over any colour.
function Label({ x, y, size, color, text, halo }: { x: number; y: number; size: number; color: string; text: string; halo?: boolean }) {
  return <G>
    {halo ? <SvgText x={x} y={y} fontSize={size} fontFamily={handwriting} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={size * 0.35} strokeLinejoin="round" textAnchor="middle">{text}</SvgText> : null}
    <SvgText x={x} y={y} fontSize={size} fontFamily={handwriting} fill={color} textAnchor="middle">{text}</SvgText>
  </G>;
}

function SketchShapeView({ shape, onPhoto }: { shape: SketchShape; onPhoto?: boolean }) {
  const stroke = ink[shape.color];
  const fill = shape.fill ? stroke : 'none';
  const common = { stroke, strokeWidth: onPhoto ? 1.8 : 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (shape.s) {
    case 'circle': return <Circle cx={shape.x} cy={shape.y} r={shape.r} fill={fill} fillOpacity={0.35} {...common} />;
    case 'ellipse': return <Ellipse cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} fill={fill} fillOpacity={0.35} {...common} />;
    case 'rect': return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={1} fill={fill} fillOpacity={0.35} {...common} />;
    case 'poly': return shape.open
      ? <Polyline points={shape.points.map(p => p.join(',')).join(' ')} fill="none" {...common} />
      : <Polygon points={shape.points.map(p => p.join(',')).join(' ')} fill={fill} fillOpacity={0.35} {...common} />;
    case 'text': return <Label x={shape.x} y={shape.y} size={shape.size} color={stroke} text={shape.text} halo={onPhoto} />;
    case 'line': {
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      const head = [angle + 2.6, angle - 2.6].map(a => `${shape.x2 + Math.cos(a) * 3.5},${shape.y2 + Math.sin(a) * 3.5}`);
      return <G>
        <Line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...common} />
        {shape.arrow ? <Polygon points={`${shape.x2},${shape.y2} ${head.join(' ')}`} fill={stroke} {...common} /> : null}
      </G>;
    }
  }
}

/**
 * A concept map drawn branch by branch, or a sketch traced stroke by stroke with the pencil on the line.
 * `drawn` counts steps and may be fractional: 3.4 is three shapes and 40% of the fourth.
 * max caps the size on the board; the enlarged view passes a bigger one.
 */
export function BoardVisualView({ visual, drawn: progress, width, drawing, max }: { visual: Visual; drawn: number; width: number; drawing: boolean; max?: number }) {
  const drawn = Math.ceil(progress);
  const pencil = Math.max(28, Math.min(44, width * 0.08));
  if (visual.type === 'map') {
    const w = Math.min(width, max ?? 640), h = w * 0.7, scale = w / 200;
    const nodes = mapLayout(visual);
    const last = drawn <= 1 ? [100, 64] : [nodes[drawn - 2].x + nodes[drawn - 2].w / 2, nodes[drawn - 2].y];
    return (
      <View accessible accessibilityLabel={`Mapa conceptual: ${visual.title}. ${visual.branches.map(b => [b.label, ...b.details].join(', ')).join('. ')}`} style={[s.box, { width: w, height: h }]}>
        <Svg width={w} height={h} viewBox="0 0 200 140">
          {nodes.slice(0, Math.max(0, drawn - 1)).map((node, i) => <G key={i}>
            <Line x1={100} y1={64} x2={node.x} y2={node.y} stroke={node.color} strokeWidth={1.2} strokeLinecap="round" />
            <Rect x={node.x - node.w / 2} y={node.y - 7} width={node.w} height={14} rx={7} fill="#FFFFFF" stroke={node.color} strokeWidth={1.2} />
            <SvgText x={node.x} y={node.y + 2.6} fontSize={7.5} fontFamily={handwriting} fill={node.color} textAnchor="middle">{node.label}</SvgText>
            {/* A white halo keeps details readable where they cross a branch line. */}
            {node.details.map((detail, j) => <G key={j}>
              <SvgText x={node.x} y={node.y + 13 + j * 6.5} fontSize={5.6} fontFamily={handwriting} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={2.4} textAnchor="middle">{detail}</SvgText>
              <SvgText x={node.x} y={node.y + 13 + j * 6.5} fontSize={5.6} fontFamily={handwriting} fill={colors.ink} textAnchor="middle">{detail}</SvgText>
            </G>)}
          </G>)}
          {drawn >= 1 ? <G>
            <Ellipse cx={100} cy={64} rx={Math.min(46, visual.title.length * 2.4 + 14)} ry={12} fill="#FFF5D6" stroke="#E0A634" strokeWidth={1.4} />
            <SvgText x={100} y={67.5} fontSize={9} fontFamily={handwriting} fill={colors.ink} textAnchor="middle">{visual.title}</SvgText>
          </G> : null}
        </Svg>
        {drawing ? <View style={[s.pencil, { left: last[0] * scale, top: last[1] * scale - pencil }]}><WritingPencil size={pencil} /></View> : null}
      </View>
    );
  }
  return <SketchView visual={visual} progress={progress} width={width} drawing={drawing} max={max} pencil={pencil} />;
}

function SketchView({ visual, progress: total, width, drawing, max, pencil }: { visual: Extract<Visual, { type: 'sketch' }>; progress: number; width: number; drawing: boolean; max?: number; pencil: number }) {
  // Generated artwork replaces primitive drafts, including boards saved by older versions.
  const shapes = visual.illustration || visual.trace?.image ? [] : visual.shapes;
  const mask = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clock = useDrawingClock(visual.trace);
  const w = Math.min(width, max ?? 520), scale = w / 100;
  const aspect = Math.min(1.4, Math.max(0.4, visual.aspect ?? 1)), h = w * aspect;
  // A map outline is traced first, then the shapes on top of it.
  const outline = lineTrace(visual);
  const traced = outline ? traceUpTo(outline.rings, total / TRACE_STEPS) : null;
  const progress = outline ? Math.max(0, total - TRACE_STEPS) : total;
  const done = Math.min(shapes.length, Math.floor(progress));
  const current = done < shapes.length && progress > done ? shapes[done] : null;
  const part = progress - done;
  // The AI drawing is revealed under the pencil: its lines first, then its colours.
  const image = visual.trace?.image;
  const pen = image && clock !== null ? traceUpTo(visual.trace!.rings, clock / 0.75) : null;
  const paint = image && clock !== null && clock > 0.75 ? traceUpTo(visual.trace!.fills ?? [], (clock - 0.75) / 0.25) : null;
  const tip = current ? partOf(strokePath(current), part).at(-1)! : done ? strokePath(shapes[done - 1]).at(-1)! : traced?.tip ?? [50, 50];
  const last = paint ? paint.tip : pen ? pen.tip : current?.s === 'text' ? [current.x + (current.text.length * part - current.text.length / 2) * current.size * 0.5, current.y] : tip;
  const onPhoto = Boolean(visual.background || image);
  const waiting = Boolean(visual.illustration && !visual.trace);
  return (
    <View accessible accessibilityLabel={`Dibujo: ${visual.title || 'boceto'}`} style={s.sketch}>
      {visual.title ? <Text style={s.title}>{visual.title}</Text> : null}
      <View style={[s.box, { width: w, height: h }]}>
        {/* An annotated photo: the real picture fills the square and the tutor writes on top of it. */}
        {visual.background ? <Image source={{ uri: visual.background.url }} resizeMode="cover" accessibilityLabel={visual.background.title} style={[StyleSheet.absoluteFill, s.photo]} /> : null}
        {image && clock !== null && visual.trace?.beforeImage ? <Image source={{ uri: visual.trace.beforeImage }} resizeMode="contain" accessibilityLabel="Dibujo anterior" style={StyleSheet.absoluteFill} /> : null}
        {image && clock === null ? <Image source={{ uri: image }} resizeMode="contain" accessibilityLabel={visual.title} style={StyleSheet.absoluteFill} /> : null}
        {waiting ? <View style={[StyleSheet.absoluteFill, s.waiting]}><Text style={s.waitingText}>✏️ Preparando el dibujo…</Text></View> : null}
        <Svg width={w} height={h} viewBox={`0 0 100 ${100 * aspect}`} style={s.over}>
          {image && clock !== null ? <G>
            <Defs>
              <Mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={100} height={100}>
                <Path d={pathOf(visual.trace!.rings.slice(0, pen!.done))} stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {pen!.current ? <Polyline points={pen!.current.map(p => p.join(',')).join(' ')} stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
                {paint ? <Path d={pathOf([...(visual.trace!.fills ?? []).slice(0, paint.done), ...(paint.current ? [paint.current] : [])])} stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
              </Mask>
            </Defs>
            <SvgImage href={{ uri: image }} x={0} y={0} width={100} height={100} preserveAspectRatio="xMidYMid meet" mask={`url(#${mask})`} />
          </G> : null}
          {traced ? <G>
            <Path d={pathOf(outline!.rings.slice(0, traced.done))} stroke="#4A5868" strokeWidth={0.45} strokeLinejoin="round" fill="none" />
            {traced.current ? <Polyline points={traced.current.map(p => p.join(',')).join(' ')} stroke="#4A5868" strokeWidth={0.45} strokeLinejoin="round" fill="none" /> : null}
          </G> : null}
          {shapes.slice(0, done).map((shape, i) => <SketchShapeView key={i} shape={shape} onPhoto={onPhoto} />)}
          {current ? <PartialShape shape={current} part={part} onPhoto={onPhoto} /> : null}
        </Svg>
        {drawing || clock !== null ? <View style={[s.pencil, { left: last[0] * scale, top: last[1] * scale - pencil }]}><WritingPencil size={pencil} /></View> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { position: 'relative', alignSelf: 'center' },
  sketch: { alignItems: 'center', gap: 4 },
  title: { fontFamily: handwriting, fontSize: 22, color: '#1F4F95' },
  pencil: { position: 'absolute' },
  photo: { borderRadius: 6 },
  // Positioned so the strokes stay above the photo.
  over: { position: 'absolute', left: 0, top: 0 },
  waiting: { alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C9D6E3' },
  waitingText: { fontFamily: handwriting, fontSize: 20, color: '#5B6B7C' },
});
