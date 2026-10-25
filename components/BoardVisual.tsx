import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';
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

function anchor(shape: SketchShape): [number, number] {
  switch (shape.s) {
    case 'circle': return [shape.x + shape.r * 0.7, shape.y - shape.r * 0.7];
    case 'rect': return [shape.x + shape.w, shape.y];
    case 'line': return [shape.x2, shape.y2];
    case 'poly': return shape.points[shape.points.length - 1];
    case 'text': return [shape.x + shape.text.length * shape.size * 0.25, shape.y];
  }
}

function SketchShapeView({ shape }: { shape: SketchShape }) {
  const stroke = ink[shape.color];
  const fill = shape.fill ? stroke : 'none';
  const common = { stroke, strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (shape.s) {
    case 'circle': return <Circle cx={shape.x} cy={shape.y} r={shape.r} fill={fill} fillOpacity={0.35} {...common} />;
    case 'rect': return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={1} fill={fill} fillOpacity={0.35} {...common} />;
    case 'poly': return <Polygon points={shape.points.map(p => p.join(',')).join(' ')} fill={fill} fillOpacity={0.35} {...common} />;
    case 'text': return <SvgText x={shape.x} y={shape.y} fontSize={shape.size} fontFamily={handwriting} fill={stroke} textAnchor="middle">{shape.text}</SvgText>;
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

/** A concept map or sketch drawn step by step, with the pencil at the newest mark. */
export function BoardVisualView({ visual, drawn, width, drawing }: { visual: Visual; drawn: number; width: number; drawing: boolean }) {
  const pencil = Math.max(22, Math.min(34, width * 0.06));
  if (visual.type === 'map') {
    const w = Math.min(width, 640), h = w * 0.7, scale = w / 200;
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
  const w = Math.min(width, 380), scale = w / 100;
  const shown = visual.shapes.slice(0, drawn);
  const last = shown.length ? anchor(shown[shown.length - 1]) : [50, 50];
  return (
    <View accessible accessibilityLabel={`Dibujo: ${visual.title || 'boceto'}`} style={s.sketch}>
      {visual.title ? <Text style={s.title}>{visual.title}</Text> : null}
      <View style={[s.box, { width: w, height: w }]}>
        <Svg width={w} height={w} viewBox="0 0 100 100">{shown.map((shape, i) => <SketchShapeView key={i} shape={shape} />)}</Svg>
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
});
