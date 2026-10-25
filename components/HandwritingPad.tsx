import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts } from '@/constants/theme';

type Point = [number, number];
type Stroke = { color: string; points: Point[] };
export type HandwritingPadHandle = { clear(): void; undo(): void; isEmpty(): boolean; toImage(): Promise<string | null> };
type Props = { height: number; color: string; enabled: boolean; placeholder: string; onStrokesChange?: (count: number) => void; onDrawingChange?: (drawing: boolean) => void };

const WIDTH = 5;
// Midpoint quadratic curves keep fast finger strokes smooth without extra points.
function pathFor(points: Point[]) {
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]} l0.1 0`;
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]; const [nx, ny] = points[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

// The AI only needs the ink: crop to it on a white page, at most 640px wide.
function webImage(strokes: Stroke[]): string | null {
  const points = strokes.flatMap(s => s.points);
  if (!points.length || typeof document === 'undefined') return null;
  const pad = 24;
  const minX = Math.min(...points.map(p => p[0])) - pad, minY = Math.min(...points.map(p => p[1])) - pad;
  const w = Math.max(...points.map(p => p[0])) + pad - minX, h = Math.max(...points.map(p => p[1])) + pad - minY;
  const scale = Math.min(1.5, 640 / w, 640 / h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = WIDTH * scale;
  for (const stroke of strokes) {
    ctx.strokeStyle = stroke.color; ctx.beginPath();
    stroke.points.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x - minX) * scale, (y - minY) * scale));
    if (stroke.points.length === 1) ctx.lineTo((stroke.points[0][0] - minX) * scale + 0.1, (stroke.points[0][1] - minY) * scale);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

/** Finger, mouse or Apple Pencil drawing surface for the child's whiteboard answer. */
export const HandwritingPad = forwardRef<HandwritingPadHandle, Props>(function HandwritingPad({ height, color, enabled, placeholder, onStrokesChange, onDrawingChange }, ref) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const svg = useRef<Svg & { toDataURL?: (cb: (base64: string) => void) => void }>(null);
  const colorRef = useRef(color); colorRef.current = color;
  const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const callbacks = useRef({ onStrokesChange, onDrawingChange }); callbacks.current = { onStrokesChange, onDrawingChange };
  const update = (next: Stroke[]) => { strokesRef.current = next; setStrokes(next); callbacks.current.onStrokesChange?.(next.length); };
  const point = (e: GestureResponderEvent): Point => [Math.round(e.nativeEvent.locationX * 10) / 10, Math.round(e.nativeEvent.locationY * 10) / 10];

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabledRef.current,
    onMoveShouldSetPanResponder: () => enabledRef.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { callbacks.current.onDrawingChange?.(true); update([...strokesRef.current, { color: colorRef.current, points: [point(e)] }]); },
    onPanResponderMove: e => {
      const all = strokesRef.current; const last = all[all.length - 1];
      if (!last) return;
      const p = point(e); const prev = last.points[last.points.length - 1];
      if (Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]) < 1.5) return;
      update([...all.slice(0, -1), { ...last, points: [...last.points, p] }]);
    },
    onPanResponderRelease: () => callbacks.current.onDrawingChange?.(false),
    onPanResponderTerminate: () => callbacks.current.onDrawingChange?.(false),
  }), []);

  useImperativeHandle(ref, () => ({
    clear: () => update([]),
    undo: () => update(strokesRef.current.slice(0, -1)),
    isEmpty: () => strokesRef.current.length === 0,
    toImage: () => {
      if (!strokesRef.current.length) return Promise.resolve(null);
      if (Platform.OS === 'web') return Promise.resolve(webImage(strokesRef.current));
      return new Promise(resolve => {
        if (!svg.current?.toDataURL) { resolve(null); return; }
        svg.current.toDataURL(base64 => resolve(base64 ? `data:image/png;base64,${base64}` : null));
      });
    },
  }));

  return (
    <View {...responder.panHandlers} accessible accessibilityLabel="Pizarra para escribir tu respuesta con el dedo o el lápiz" style={[s.pad, { height }, !enabled && s.disabled, Platform.OS === 'web' && s.webNoScroll]}>
      {!strokes.length ? <View pointerEvents="none"><Text style={s.placeholder}>{placeholder}</Text></View> : null}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg ref={svg} width="100%" height="100%">
          {Platform.OS !== 'web' ? <Rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" /> : null}
          {strokes.map((stroke, i) => <Path key={i} d={pathFor(stroke.points)} stroke={stroke.color} strokeWidth={WIDTH} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
        </Svg>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  pad: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9CCDD', borderRadius: 14, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  // Keeps the page from scrolling or selecting text while a finger or pencil draws.
  webNoScroll: { touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as object,
  placeholder: { fontFamily: fonts.body, fontSize: 16, color: colors.inkMuted, opacity: 0.7, textAlign: 'center', paddingHorizontal: 16 },
});
