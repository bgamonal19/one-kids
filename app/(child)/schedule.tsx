import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { addDays, fromDateKey, hasSchoolCalendar, planWeek, toDateKey, weekStart, WEEKDAY_NAMES, type DayPlan } from '@/lib/school-calendar';
import { useFamily } from '@/lib/store';

const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions) => fromDateKey(key).toLocaleDateString('es-ES', opts);

export default function ScheduleScreen() {
  const { state } = useFamily();
  const { width } = useWindowDimensions();
  const today = toDateKey(new Date());
  const [monday, setMonday] = useState(weekStart(today));
  const country = state.child?.country;
  const week = useMemo(() => planWeek(state.courses, state.agenda, country, monday), [state.courses, state.agenda, country, monday]);
  const scheduled = state.courses.some((c) => c.schedule?.length);
  const alerts = week.flatMap((day) => day.classes.filter((c) => c.conflicts.length).map((c) => ({ day, ...c })));
  const wide = width >= 900;
  const sunday = addDays(monday, 6);
  const range = `${dayLabel(monday, { day: 'numeric', month: 'short' })} – ${dayLabel(sunday, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <Screen scroll>
      <Text style={styles.title}>🗓️ Rol semanal</Text>
      <Text style={styles.sub}>
        {hasSchoolCalendar(country)
          ? `Calendario escolar y feriados nacionales de ${country}. Las vacaciones son aproximadas: tu colegio puede moverlas unos días.`
          : 'Elige el país donde estudias en "Mi aprendizaje" para ver feriados y vacaciones.'}
      </Text>

      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={() => setMonday(addDays(monday, -7))} style={styles.navBtn}><Text style={styles.navText}>←</Text></Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.range}>{range}</Text>
          {monday !== weekStart(today) ? (
            <Pressable accessibilityRole="button" onPress={() => setMonday(weekStart(today))}><Text style={styles.link}>Volver a esta semana</Text></Pressable>
          ) : <Text style={styles.thisWeek}>Esta semana</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana siguiente" onPress={() => setMonday(addDays(monday, 7))} style={styles.navBtn}><Text style={styles.navText}>→</Text></Pressable>
      </View>

      {alerts.length ? (
        <View accessibilityRole="alert" style={styles.alertBox}>
          <Text style={styles.alertTitle}>⚠️ {alerts.length === 1 ? 'Un curso choca con tu agenda' : `${alerts.length} cursos chocan con tu agenda`}</Text>
          {alerts.map(({ day, course, slot, conflicts }) => (
            <Text key={`${day.date}-${course.id}-${slot.start}`} style={styles.alertText}>
              • El {dayLabel(day.date, { weekday: 'long', day: 'numeric' })} tienes {conflicts.map((e) => `«${e.title}»${e.time ? ` a las ${e.time}` : ''}`).join(' y ')} a la hora de {course.title} ({slot.start}–{slot.end}). Es posible que ese día no se lleve a cabo el curso de {course.title}.
            </Text>
          ))}
        </View>
      ) : null}

      {!scheduled ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aún no hay horarios</Text>
          <Text style={styles.emptyText}>Abre el perfil de cada curso y añade sus días y horas: profesor, número de referencia y horario.</Text>
          <PrimaryButton label="📚 Configurar mis cursos" onPress={() => router.push('/(child)/courses')} />
        </View>
      ) : null}

      <View style={[styles.days, wide && styles.daysWide]}>
        {week.map((day) => <DayCard key={day.date} day={day} today={day.date === today} wide={wide} />)}
      </View>

      <PrimaryButton label="📚 Mis cursos" variant="secondary" onPress={() => router.push('/(child)/courses')} style={{ marginTop: spacing.lg }} />
      <PrimaryButton label="📅 Mi agenda" variant="ghost" onPress={() => router.push('/(child)/calendar')} />
    </Screen>
  );
}

function DayCard({ day, today, wide }: { day: DayPlan; today: boolean; wide: boolean }) {
  const free = day.classes.length === 0 && day.events.length === 0;
  return (
    <View style={[styles.day, wide && styles.dayWide, today && styles.dayToday]}>
      <View style={styles.dayHead}>
        <Text style={styles.dayName}>{WEEKDAY_NAMES[day.weekday - 1].replace(/^./, (c) => c.toUpperCase())}</Text>
        <Text style={styles.dayNum}>{fromDateKey(day.date).getDate()}</Text>
      </View>
      {day.holiday ? <Text style={[styles.badge, styles.holiday]}>🎉 Feriado: {day.holiday}</Text> : null}
      {!day.holiday && day.vacation ? <Text style={[styles.badge, styles.vacation]}>🏖️ {day.vacation}</Text> : null}
      {day.classes.map(({ course, slot, cancelled, conflicts }) => (
        <Pressable
          key={`${course.id}-${slot.start}`}
          accessibilityRole="button"
          accessibilityLabel={`${course.title}, ${slot.start} a ${slot.end}${cancelled ? ', no hay clase' : ''}${conflicts.length ? ', choca con tu agenda' : ''}`}
          onPress={() => router.push({ pathname: '/(child)/course/[id]', params: { id: course.id } })}
          style={[styles.cls, { borderLeftColor: course.color }, cancelled && styles.clsOff, conflicts.length > 0 && styles.clsWarn]}
        >
          <Text style={styles.clsTime}>{slot.start}–{slot.end}</Text>
          <Text style={[styles.clsTitle, cancelled && styles.strike]}>{course.title}</Text>
          {course.teacher ? <Text style={styles.clsMeta}>👩‍🏫 {course.teacher}</Text> : null}
          {course.reference ? <Text style={styles.clsMeta}>N.º {course.reference}</Text> : null}
          {cancelled ? <Text style={styles.clsOffText}>No hay clase · {cancelled}</Text> : null}
          {conflicts.map((e) => <Text key={e.id} style={styles.clsWarnText}>⚠️ {e.time ? `${e.time} ` : ''}{e.title}: puede que no haya {course.title} este día</Text>)}
        </Pressable>
      ))}
      {day.events.map((e) => <Text key={e.id} style={styles.event}>📅 {e.time ? `${e.time} · ` : ''}{e.title}</Text>)}
      {free ? <Text style={styles.free}>Libre</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink },
  sub: { marginTop: 8, marginBottom: spacing.md, fontFamily: fonts.body, color: colors.inkMuted, fontSize: 15 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  navBtn: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  navText: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink },
  range: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  thisWeek: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
  link: { fontFamily: fonts.bodyBold, color: colors.skyDeep },
  alertBox: { backgroundColor: '#FFF4E0', borderColor: '#F2B441', borderWidth: 2, borderRadius: radii.lg, padding: 14, gap: 6, marginBottom: spacing.md },
  alertTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: '#7A4B00' },
  alertText: { fontFamily: fonts.bodySemi, color: '#7A4B00', fontSize: 15 },
  emptyBox: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 16, gap: 8, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  emptyText: { fontFamily: fonts.body, color: colors.inkMuted, fontSize: 15 },
  days: { gap: 10 },
  daysWide: { flexDirection: 'row', alignItems: 'stretch' },
  day: { backgroundColor: colors.white, borderRadius: radii.lg, padding: 12, gap: 8, borderWidth: 2, borderColor: 'transparent' },
  dayWide: { flex: 1, minHeight: 220 },
  dayToday: { borderColor: colors.sky },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dayName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  dayNum: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.inkMuted },
  badge: { fontFamily: fonts.bodyBold, fontSize: 13, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  holiday: { backgroundColor: '#FFE1DA', color: '#A33A20' },
  vacation: { backgroundColor: '#DFF6EA', color: '#1D6B47' },
  cls: { backgroundColor: colors.mist, borderRadius: radii.md, padding: 10, borderLeftWidth: 6, gap: 2 },
  clsOff: { opacity: 0.6 },
  clsWarn: { backgroundColor: '#FFF4E0' },
  clsTime: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkMuted },
  clsTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink },
  strike: { textDecorationLine: 'line-through' },
  clsMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  clsOffText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  clsWarnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#7A4B00' },
  event: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  free: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
});
