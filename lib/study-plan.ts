import type { CourseItem, CourseTopic, FamilyState, TaskItem } from './types';

// Pure helpers for study mode and the parent report; no React Native imports so node tests can load them.
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MAX_TOPICS = 80;
const monthOf = (word: string) => {
  const clean = word.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^setiembre$/, 'septiembre');
  const index = MONTHS.indexOf(clean);
  return index >= 0 ? index + 1 : undefined;
};
const cleanTitle = (line: string) => line.replace(/^\s*(?:[-–•*·▪►]+|\d{1,3}[.)-]|[a-z][.)])\s*/i, '').replace(/\s+/g, ' ').trim().slice(0, 120);

export type ParsedTopic = { title: string; month?: number };

/**
 * One topic per line, as parents usually copy them from the school list.
 * A line with only a month ("Marzo" or "MARZO:") applies to the lines below it;
 * "Abril: Fracciones; Decimales" gives that month to each topic after the colon.
 */
export function parseTopicList(text: string): ParsedTopic[] {
  const topics: ParsedTopic[] = [];
  const seen = new Set<string>();
  let month: number | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = line.replace(/[:.\-–]+$/, '').trim();
    if (monthOf(header)) { month = monthOf(header); continue; }
    const prefixed = line.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s*[:\-–]\s*(.+)$/);
    const lineMonth = prefixed ? monthOf(prefixed[1]) : undefined;
    const parts = lineMonth ? prefixed![2].split(/\s*;\s*/) : [line];
    for (const part of parts) {
      const title = cleanTitle(part);
      const key = title.toLowerCase();
      if (title.length < 2 || seen.has(key)) continue;
      seen.add(key);
      topics.push(lineMonth ?? month ? { title, month: lineMonth ?? month } : { title });
      if (topics.length >= MAX_TOPICS) return topics;
    }
  }
  return topics;
}

/** Adds new topics after the existing ones, skipping titles the course already has. */
export function mergeTopics(existing: CourseTopic[], parsed: ParsedTopic[], makeId: () => string): CourseTopic[] {
  const have = new Set(existing.map(t => t.title.toLowerCase()));
  const added = parsed.filter(t => !have.has(t.title.toLowerCase())).map(t => ({ id: makeId(), title: t.title, ...(t.month ? { month: t.month } : {}), done: false }));
  return [...existing, ...added].slice(0, MAX_TOPICS);
}

export type CourseProgress = { total: number; done: number; percent: number; current: CourseTopic | null; next: CourseTopic[]; thisMonth: CourseTopic[] };

/** Study mode moves through the syllabus in order: the first unfinished topic is the one to study. */
export function courseProgress(course: Pick<CourseItem, 'topics'>, today = new Date()): CourseProgress {
  const topics = course.topics ?? [];
  const done = topics.filter(t => t.done).length;
  const pending = topics.filter(t => !t.done);
  const month = today.getMonth() + 1;
  return {
    total: topics.length, done, percent: topics.length ? Math.round((done / topics.length) * 100) : 0,
    current: pending[0] ?? null, next: pending.slice(1, 4), thisMonth: topics.filter(t => t.month === month),
  };
}

/** What the tutor needs to explain in line with the class: the topic now, what came before and what follows. */
export function syllabusFor(course: Pick<CourseItem, 'topics'>, topicTitle?: string) {
  const topics = course.topics ?? [];
  const current = topicTitle || courseProgress(course).current?.title || '';
  return { current, done: topics.filter(t => t.done).map(t => t.title).slice(-12), next: topics.filter(t => !t.done && t.title !== current).map(t => t.title).slice(0, 5) };
}

/** Two or more right answers out of three passes the topic. */
export const passed = (right: number, total: number) => total > 0 && right / total >= 0.6;

export function completeTopic(topics: CourseTopic[], topicId: string, score: { right: number; total: number }, now = new Date()): CourseTopic[] {
  const at = now.toISOString();
  return topics.map(t => t.id !== topicId ? t : { ...t, score, studiedAt: at, ...(passed(score.right, score.total) ? { done: true, doneAt: t.doneAt ?? at } : {}) });
}

export type ReportPeriod = 'today' | 'week' | 'all';
export type ReportMemory = { at: string; course: string; topic: string; summary: string };
const since = (period: ReportPeriod, now: Date) => {
  if (period === 'all') return 0;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - 6);
  return start.getTime();
};
const inPeriod = (iso: string | undefined, from: number) => Boolean(iso) && Date.parse(iso!) >= from;

/**
 * What the parent report sends to the AI: tasks, syllabus progress and tutor notes, without the child's name.
 * Everything pending is always included; finished work only for the chosen period.
 */
export function reportInput(state: Pick<FamilyState, 'child' | 'tasks' | 'courses'>, period: ReportPeriod, memory: ReportMemory[] = [], now = new Date()) {
  const from = since(period, now);
  const courseTitle = new Map(state.courses.map(c => [c.id, c.title]));
  const task = (t: TaskItem) => ({ title: t.title.slice(0, 160), course: t.courseId ? courseTitle.get(t.courseId) ?? '' : '', done: t.done, due: t.dueDate ?? '', doneAt: t.doneAt ?? '', addedBy: t.addedBy ?? '' });
  const tasks = state.tasks.filter(t => !t.done || period === 'all' || inPeriod(t.doneAt, from) || (!t.doneAt && inPeriod(t.createdAt, from))).slice(0, 80).map(task);
  const courses = state.courses.filter(c => c.topics?.length).slice(0, 20).map(c => {
    const topics = c.topics ?? [];
    return {
      title: c.title.slice(0, 80),
      progress: `${topics.filter(t => t.done).length}/${topics.length}`,
      studied: topics.filter(t => inPeriod(t.studiedAt, from)).slice(0, 15).map(t => ({ topic: t.title, done: t.done, score: t.score ? `${t.score.right}/${t.score.total}` : '' })),
      pending: topics.filter(t => !t.done).slice(0, 8).map(t => t.title),
    };
  });
  const notes = memory.filter(m => inPeriod(m.at, from)).slice(-40).map(m => ({ course: m.course.slice(0, 80), topic: m.topic.slice(0, 120), summary: m.summary.slice(0, 400) }));
  return { period, age: state.child?.age ?? 8, today: now.toISOString().slice(0, 10), tasks, courses, notes };
}
