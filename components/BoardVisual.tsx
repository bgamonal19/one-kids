import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { WritingPencil } from './WritingPencil';
import type { BoardVisual as Visual, SketchColor, SketchShape } from '@/lib/tutor';
import { colors } from '@/constants/theme';

const handwriting = 'PatrickHand_400Regular';
const ink: Record<SketchColor, string> = { black: '#1F2A36', blue: '#2C60AE', red: '#E2553A', green: '#23935F', orange: '#F08A24', yellow: '#E9B824', brown: '#8A5A36', purple: '#7B4FC2' };
const branchColors = ['#2C60AE', '#E2553A', '#23935F', '#7B4FC2', '#F08A24', '#1A8FBF'];

/** Each map branch or sketch shape is one drawing step. */
export function visualSteps(visual: Visual) {
  return visual.type === 'map' ? visual.branches.length + 1 : visual.shapes.length;
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
  const w = Math.min(width, max ?? 520), scale = w / 100;
  const done = Math.min(visual.shapes.length, Math.floor(progress));
  const current = done < visual.shapes.length && progress > done ? visual.shapes[done] : null;
  const part = progress - done;
  const tip = current ? partOf(strokePath(current), part).at(-1)! : done ? strokePath(visual.shapes[done - 1]).at(-1)! : [50, 50];
  const last = current?.s === 'text' ? [current.x + (current.text.length * part - current.text.length / 2) * current.size * 0.5, current.y] : tip;
  return (
    <View accessible accessibilityLabel={`Dibujo: ${visual.title || 'boceto'}`} style={s.sketch}>
      {visual.title ? <Text style={s.title}>{visual.title}</Text> : null}
      <View style={[s.box, { width: w, height: w }]}>
        {/* An annotated photo: the real picture fills the square and the tutor writes on top of it. */}
        {visual.background ? <Image source={{ uri: visual.background.url }} resizeMode="cover" accessibilityLabel={visual.background.title} style={[StyleSheet.absoluteFill, s.photo]} /> : null}
        <Svg width={w} height={w} viewBox="0 0 100 100" style={s.over}>
          {visual.shapes.slice(0, done).map((shape, i) => <SketchShapeView key={i} shape={shape} onPhoto={Boolean(visual.background)} />)}
          {current ? <PartialShape shape={current} part={part} onPhoto={Boolean(visual.background)} /> : null}
        </Svg>
        {drawing ? <View style={[s.pencil, { left: last[0] * scale, top: last[1] * scale - pencil }]}><WritingPencil size={pencil} /></View> : null}
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
});
