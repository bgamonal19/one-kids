import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '@/lib/store';
import type { ExpressionId } from '@/lib/expressions';
import { KikoMascot } from './KikoMascot';

type CompanionState = { expression: ExpressionId; bubble?: string };
const FloatContext = createContext<(value: CompanionState | null) => void>(() => {});
export function useFloatingCompanion(expression: ExpressionId, bubble?: string, enabled = true) {
  const update = useContext(FloatContext);
  useEffect(() => { if (enabled) update({ expression, bubble }); }, [update, expression, bubble, enabled]);
  useEffect(() => () => { if (enabled) update(null); }, [update, enabled]);
}
export function FloatingCompanionProvider({ children }: { children: ReactNode }) {
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  return <FloatContext value={setCompanion}>{children}{companion ? <DraggableCompanion {...companion} /> : null}</FloatContext>;
}
function DraggableCompanion({ expression, bubble }: CompanionState) {
  const { state } = useFamily();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = width >= 700 ? 150 : 100;
  const boxHeight = size + 48;
  const bounds = useRef({ width, height, size, boxHeight, top: insets.top });
  const position = useRef({ x: Math.max(8, width - size - 24), y: Math.max(insets.top + 84, height * .2) });
  const anchor = useRef({x: 0, y: 0});
  const [pan] = useState(() => new Animated.ValueXY({ x: Math.max(8, width - size - 24), y: Math.max(insets.top + 84, height * .2) }));
  const [dragging, setDragging] = useState(false);
  const clamp = useCallback((x: number, y: number) => {
    const b = bounds.current;
    return { x: Math.max(8, Math.min(Math.max(8, b.width - b.size - 8), x)), y: Math.max(b.top + 8, Math.min(Math.max(b.top + 8, b.height - b.boxHeight - 12), y)) };
  }, []);
  // PanResponder.create registers these event callbacks; it never reads their refs during render.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { anchor.current = position.current; setDragging(true); },
    onPanResponderMove: (_, gesture) => { position.current = clamp(anchor.current.x + gesture.dx, anchor.current.y + gesture.dy); pan.setValue(position.current); },
    onPanResponderRelease: () => setDragging(false),
    onPanResponderTerminate: () => setDragging(false),
    onPanResponderTerminationRequest: () => false,
  }), [pan, clamp]);
  useEffect(() => { bounds.current = {width,height,size,boxHeight,top:insets.top}; position.current = clamp(position.current.x, position.current.y); pan.setValue(position.current); }, [width, height, size, boxHeight, insets.top, pan, clamp]);
  return <View pointerEvents="box-none" style={s.overlay}>
    <Animated.View testID="floating-companion" {...responder.panHandlers} accessibilityLabel="Compañero flotante. Arrástrame para cambiarme de lugar." style={[s.agent, { width: size, transform: pan.getTranslateTransform() }, Platform.OS === 'web' ? { cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' } as never : null]}>
      {bubble ? <Text numberOfLines={2} style={s.bubble}>{bubble}</Text> : null}
      <KikoMascot character={state.child?.companion ?? 'bear'} age={state.child?.age ?? 8} expression={expression} size={size} animated={!dragging} />
    </Animated.View>
  </View>;
}
const s = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10000, elevation: 10000 },
  agent: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  bubble: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, color: '#23466B', fontSize: 12, marginBottom: 2 },
});
