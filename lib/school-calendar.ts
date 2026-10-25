import type { AgendaEvent, CourseItem, CourseSlot } from './types';

// Weekly course plan ("rol semanal"): national holidays and approximate school breaks per country,
// bundled here so it works offline. Regional holidays and each school's exact dates are not covered.

export const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
/** Agenda plans only have a start time, so they are assumed to last this long. */
export const AGENDA_EVENT_MINUTES = 60;

type DayMark = { date: string; name: string };
type Break = { from: string; to: string; name: string };

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key: string, days: number) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}
/** 1 = lunes … 7 = domingo. */
export function isoWeekday(key: string) {
  const day = fromDateKey(key).getDay();
  return day === 0 ? 7 : day;
}
export const weekStart = (key: string) => addDays(key, 1 - isoWeekday(key));

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easterSunday(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function nationalHolidays(country: string | undefined, year: number): DayMark[] {
  const fixed = (md: string, name: string) => ({ date: `${year}-${md}`, name });
  const easter = easterSunday(year);
  const fromEaster = (days: number, name: string) => ({ date: addDays(easter, days), name });
  if (country === 'Perú') return [
    fixed('01-01', 'Año Nuevo'), fromEaster(-3, 'Jueves Santo'), fromEaster(-2, 'Viernes Santo'), fixed('05-01', 'Día del Trabajo'),
    fixed('06-07', 'Batalla de Arica y Día de la Bandera'), fixed('06-29', 'San Pedro y San Pablo'), fixed('07-23', 'Día de la Fuerza Aérea'),
    fixed('07-28', 'Fiestas Patrias'), fixed('07-29', 'Fiestas Patrias'), fixed('08-06', 'Batalla de Junín'), fixed('08-30', 'Santa Rosa de Lima'),
    fixed('10-08', 'Combate de Angamos'), fixed('11-01', 'Todos los Santos'), fixed('12-08', 'Inmaculada Concepción'),
    fixed('12-09', 'Batalla de Ayacucho'), fixed('12-25', 'Navidad'),
  ];
  if (country === 'España') return [
    fixed('01-01', 'Año Nuevo'), fixed('01-06', 'Reyes'), fromEaster(-2, 'Viernes Santo'), fixed('05-01', 'Día del Trabajo'),
    fixed('08-15', 'Asunción'), fixed('10-12', 'Fiesta Nacional'), fixed('11-01', 'Todos los Santos'), fixed('12-06', 'Día de la Constitución'),
    fixed('12-08', 'Inmaculada Concepción'), fixed('12-25', 'Navidad'),
  ];
  if (country === 'Italia') return [
    fixed('01-01', 'Capodanno'), fixed('01-06', 'Epifanía'), fromEaster(0, 'Pascua'), fromEaster(1, 'Lunes del Ángel'),
    fixed('04-25', 'Festa della Liberazione'), fixed('05-01', 'Festa del Lavoro'), fixed('06-02', 'Festa della Repubblica'),
    fixed('08-15', 'Ferragosto'), ...(year >= 2026 ? [fixed('10-04', 'San Francisco de Asís')] : []), fixed('11-01', 'Todos los Santos'),
    fixed('12-08', 'Inmaculada Concepción'), fixed('12-25', 'Navidad'), fixed('12-26', 'San Esteban'),
  ];
  return [];
}

/** Approximate national school breaks that start in `year` (each school or region may shift them a few days). */
function schoolBreaksStarting(country: string | undefined, year: number): Break[] {
  const easter = easterSunday(year);
  if (country === 'Perú') return [
    { from: `${year}-07-27`, to: `${year}-08-07`, name: 'Vacaciones de medio año' },
    { from: `${year}-12-19`, to: `${year + 1}-03-15`, name: 'Vacaciones de verano' },
  ];
  if (country === 'España') return [
    { from: addDays(easter, -6), to: addDays(easter, 1), name: 'Vacaciones de Semana Santa' },
    { from: `${year}-06-20`, to: `${year}-09-07`, name: 'Vacaciones de verano' },
    { from: `${year}-12-23`, to: `${year + 1}-01-07`, name: 'Vacaciones de Navidad' },
  ];
  if (country === 'Italia') return [
    { from: addDays(easter, -3), to: addDays(easter, 2), name: 'Vacaciones de Pascua' },
    { from: `${year}-06-09`, to: `${year}-09-13`, name: 'Vacaciones de verano' },
    { from: `${year}-12-23`, to: `${year + 1}-01-06`, name: 'Vacaciones de Navidad' },
  ];
  return [];
}

export const hasSchoolCalendar = (country: string | undefined) => country === 'Perú' || country === 'España' || country === 'Italia';

export function dayStatus(country: string | undefined, key: string): { holiday?: string; vacation?: string } {
  const year = Number(key.slice(0, 4));
  const holiday = nationalHolidays(country, year).find((h) => h.date === key)?.name;
  const vacation = [...schoolBreaksStarting(country, year - 1), ...schoolBreaksStarting(country, year)]
    .find((b) => b.from <= key && key <= b.to)?.name;
  return { holiday, vacation };
}

export function toMinutes(time: string | undefined): number | null {
  const match = /^(\d{1,2})[:.h](\d{2})$/.exec((time ?? '').trim());
  if (!match) return null;
  const h = Number(match[1]), m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
}
/** "9:5" style input is rejected; "9:05", "09.05" and "9h05" become "09:05". */
export function normalizeTime(time: string) {
  const minutes = toMinutes(time);
  return minutes === null ? null : `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
export const validSlot = (slot: CourseSlot) => {
  const s = toMinutes(slot.start), e = toMinutes(slot.end);
  return slot.day >= 1 && slot.day <= 7 && s !== null && e !== null && s < e;
};

/** An agenda plan without a time counts as the whole day. */
export function overlaps(event: AgendaEvent, slot: CourseSlot) {
  const start = toMinutes(event.time);
  if (start === null) return true;
  return start < (toMinutes(slot.end) ?? 0) && start + AGENDA_EVENT_MINUTES > (toMinutes(slot.start) ?? 0);
}

export type PlannedClass = {
  course: CourseItem;
  slot: CourseSlot;
  /** Why the class does not happen that day (holiday or school break). */
  cancelled?: string;
  conflicts: AgendaEvent[];
};
export type DayPlan = { date: string; weekday: number; holiday?: string; vacation?: string; classes: PlannedClass[]; events: AgendaEvent[] };

export function planDay(courses: CourseItem[], agenda: AgendaEvent[], country: string | undefined, date: string): DayPlan {
  const weekday = isoWeekday(date);
  const { holiday, vacation } = dayStatus(country, date);
  const events = agenda.filter((e) => e.date === date);
  const classes = courses
    .flatMap((course) => (course.schedule ?? []).filter((slot) => slot.day === weekday && validSlot(slot)).map((slot) => ({ course, slot })))
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start))
    .map(({ course, slot }): PlannedClass => {
      const cancelled = holiday ? `Feriado: ${holiday}` : vacation && course.followsSchool !== false ? vacation : undefined;
      return { course, slot, cancelled, conflicts: cancelled ? [] : events.filter((e) => overlaps(e, slot)) };
    });
  return { date, weekday, holiday, vacation, classes, events };
}

export function planWeek(courses: CourseItem[], agenda: AgendaEvent[], country: string | undefined, anyDay: string): DayPlan[] {
  const monday = weekStart(anyDay);
  return Array.from({ length: 7 }, (_, i) => planDay(courses, agenda, country, addDays(monday, i)));
}

/** Classes that an agenda plan clashes with (empty when the class is already off that day). */
export function eventConflicts(event: AgendaEvent, courses: CourseItem[], country: string | undefined) {
  return planDay(courses, [event], country, event.date).classes.filter((c) => c.conflicts.length > 0);
}

export function upcomingConflictCount(courses: CourseItem[], agenda: AgendaEvent[], country: string | undefined, from: string, days = 7) {
  let count = 0;
  for (let i = 0; i < days; i++) count += planDay(courses, agenda, country, addDays(from, i)).classes.filter((c) => c.conflicts.length).length;
  return count;
}

export const slotLabel = (slot: CourseSlot) => `${WEEKDAY_NAMES[slot.day - 1]} ${slot.start}–${slot.end}`;
