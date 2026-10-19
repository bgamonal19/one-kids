import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  // Monday = 0
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function CalendarScreen() {
  const { state } = useFamily();
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const total = daysInMonth(year, month);
    const start = startWeekday(year, month);
    const list: (number | null)[] = Array(start).fill(null);
    for (let d = 1; d <= total; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [year, month]);

  const monthLabel = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const taskDays = state.tasks.length;

  return (
    <Screen scroll>
      <Text style={styles.title}>Calendario</Text>
      <Text style={styles.sub}>
        {state.child?.name}, hoy tienes {taskDays} tarea{taskDays === 1 ? '' : 's'} en tu lista.
      </Text>

      <View style={styles.nav}>
        <Pressable
          onPress={() => setCursor(new Date(year, month - 1, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>←</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel}</Text>
        <Pressable
          onPress={() => setCursor(new Date(year, month + 1, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>→</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.week}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d, i) => {
          const isToday =
            d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          return (
            <View key={i} style={[styles.cell, isToday && styles.today]}>
              <Text style={[styles.day, isToday && styles.dayToday]}>{d ?? ''}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  sub: {
    marginTop: 8,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 16,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink },
  month: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  week: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  today: { backgroundColor: colors.coral },
  day: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  dayToday: { color: colors.white },
});
