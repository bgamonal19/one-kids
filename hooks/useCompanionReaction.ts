import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpressionId } from '@/lib/expressions';

/** Event-driven reactions; no polling and no timers surviving navigation. */
export function useCompanionReaction(initial: ExpressionId = 'hello') {
  const [expression, setExpression] = useState<ExpressionId>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const react = useCallback((next: ExpressionId, duration = 0, fallback: ExpressionId = 'listen') => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setExpression(next);
    if (duration > 0) timer.current = setTimeout(() => { setExpression(fallback); timer.current = null; }, duration);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { expression, react };
}
