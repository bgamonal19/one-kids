import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoardVisual, ImageSearch } from './tutor';

/** One board the tutor wrote, kept on this device so the child can review the day. */
export type HistoryEntry = { id: string; at: string; childLine?: string; lines: string[]; reply: string; visual?: BoardVisual | null; images?: ImageSearch[]; summary?: string[] };
export type TutorHistory = Record<string, HistoryEntry[]>;

const KEEP_DAYS = 14;
const PER_DAY = 80;
const key = (childId: string) => `onekids.tutor-history.v1.${childId}`;

/** Local calendar day, so "today" follows the child's clock rather than UTC. */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addEntry(history: TutorHistory, entry: HistoryEntry, day = dayKey(new Date(entry.at))): TutorHistory {
  const next = { ...history, [day]: [...(history[day] ?? []), entry].slice(-PER_DAY) };
  const days = Object.keys(next).sort().reverse().slice(0, KEEP_DAYS);
  return Object.fromEntries(days.map(d => [d, next[d]]));
}

export async function loadHistory(childId: string): Promise<TutorHistory> {
  try {
    const raw = await AsyncStorage.getItem(key(childId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export async function saveHistory(childId: string, history: TutorHistory) {
  try { await AsyncStorage.setItem(key(childId), JSON.stringify(history)); } catch { /* history is a convenience; never block the lesson */ }
}

export function dayLabel(day: string, today = dayKey()) {
  if (day === today) return 'Hoy';
  const [y, m, d] = day.split('-').map(Number);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (day === dayKey(yesterday)) return 'Ayer';
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}
