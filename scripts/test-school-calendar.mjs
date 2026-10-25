import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/school-calendar.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { easterSunday, dayStatus, planWeek, eventConflicts, normalizeTime, upcomingConflictCount, weekStart } = exports;
const english = { id: 'en', title: 'Inglés', desc: '', color: '#000', link: 'custom', teacher: 'Laura', reference: 'ING-1', schedule: [{ day: 4, start: '16:00', end: '17:00' }] };
const swim = { ...english, id: 'sw', title: 'Natación', followsSchool: false, schedule: [{ day: 4, start: '18:00', end: '19:00' }] };
const event = (date, time, title = 'Dentista') => ({ id: `${date}${time}`, title, date, time, note: '' });
test('Easter and movable holidays', () => {
  assert.equal(easterSunday(2026), '2026-04-05'); assert.equal(easterSunday(2027), '2027-03-28');
  assert.equal(dayStatus('Perú', '2026-04-02').holiday, 'Jueves Santo');
  assert.equal(dayStatus('España', '2026-04-03').holiday, 'Viernes Santo');
  assert.equal(dayStatus('Italia', '2026-04-06').holiday, 'Lunes del Ángel');
  assert.equal(dayStatus('Perú', '2026-07-28').holiday, 'Fiestas Patrias');
  assert.equal(dayStatus('Otro', '2026-12-25').holiday, undefined);
});
test('school breaks across the new year', () => {
  assert.equal(dayStatus('España', '2027-01-04').vacation, 'Vacaciones de Navidad');
  assert.equal(dayStatus('Perú', '2027-02-10').vacation, 'Vacaciones de verano');
  assert.equal(dayStatus('Italia', '2026-10-27').vacation, undefined);
});
test('weekly plan cancels classes on holidays and school breaks, except non-school courses on breaks', () => {
  const week = planWeek([english, swim], [], 'Perú', '2026-07-30'); // Thursday 30 Jul 2026, mid-year break
  const thursday = week[3];
  assert.equal(thursday.date, '2026-07-30');
  assert.equal(thursday.classes.find(c => c.course.id === 'en').cancelled, 'Vacaciones de medio año');
  assert.equal(thursday.classes.find(c => c.course.id === 'sw').cancelled, undefined);
  const holiday = planWeek([swim], [], 'España', '2026-10-12')[0]; // Monday 12 Oct
  assert.equal(holiday.holiday, 'Fiesta Nacional');
  assert.equal(planWeek([{ ...swim, schedule: [{ day: 1, start: '18:00', end: '19:00' }] }], [], 'España', '2026-10-12')[0].classes[0].cancelled, 'Feriado: Fiesta Nacional');
});
test('agenda plans that overlap a class raise a conflict', () => {
  const day = '2026-10-29'; // Thursday
  assert.equal(eventConflicts(event(day, '16:30'), [english], 'Perú').length, 1);
  assert.equal(eventConflicts(event(day, '15:30'), [english], 'Perú').length, 1, 'a one-hour plan from 15:30 reaches 16:00');
  assert.equal(eventConflicts(event(day, '15:00'), [english], 'Perú').length, 0);
  assert.equal(eventConflicts(event(day, '17:00'), [english], 'Perú').length, 0);
  assert.equal(eventConflicts(event(day, ''), [english], 'Perú').length, 1, 'a plan without time counts as the whole day');
  assert.equal(eventConflicts(event('2026-10-28', '16:30'), [english], 'Perú').length, 0, 'other weekday');
  assert.equal(eventConflicts(event('2026-07-30', '16:30'), [english], 'Perú').length, 0, 'no class during the break');
  assert.equal(upcomingConflictCount([english], [event(day, '16:30')], 'Perú', weekStart(day)), 1);
});
test('time input normalisation', () => {
  assert.equal(normalizeTime('9:05'), '09:05'); assert.equal(normalizeTime('16.30'), '16:30'); assert.equal(normalizeTime('9h30'), '09:30');
  assert.equal(normalizeTime('25:00'), null); assert.equal(normalizeTime('abc'), null);
});
