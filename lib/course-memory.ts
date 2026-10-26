import AsyncStorage from '@react-native-async-storage/async-storage';

/** What the child worked on with the tutor in one course, so the next lesson builds on it. */
export type CourseMemoryEntry = { at: string; courseId: string; topic: string; summary: string };
export type CourseMemory = CourseMemoryEntry[];

const PER_COURSE = 30;
const key = (childId: string) => `onekids.course-memory.v1.${childId}`;

/** Keeps one entry per topic: a new answer on the same topic replaces the old one. */
export function addMemory(memory: CourseMemory, entry: CourseMemoryEntry): CourseMemory {
  const same = (m: CourseMemoryEntry) => m.courseId === entry.courseId && m.topic.toLowerCase() === entry.topic.toLowerCase();
  const previous = memory.find(same);
  const next = [...memory.filter(m => !same(m)), { ...entry, summary: entry.summary || previous?.summary || '' }];
  const course = next.filter(m => m.courseId === entry.courseId);
  const drop = new Set(course.slice(0, Math.max(0, course.length - PER_COURSE)));
  return next.filter(m => !drop.has(m));
}

export function courseEntries(memory: CourseMemory, courseId: string, limit = 12): CourseMemory {
  return memory.filter(m => m.courseId === courseId).slice(-limit);
}

export async function readCourseMemory(childId: string, courseId?: string): Promise<CourseMemory> {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(key(childId))) || '[]');
    const all: CourseMemory = Array.isArray(parsed) ? parsed.filter(m => m && typeof m.courseId === 'string' && typeof m.topic === 'string') : [];
    return courseId ? all.filter(m => m.courseId === courseId) : all;
  } catch { return []; }
}

export async function saveCourseMemory(childId: string, memory: CourseMemory) {
  try { await AsyncStorage.setItem(key(childId), JSON.stringify(memory)); } catch { /* a convenience; never block the lesson */ }
}
