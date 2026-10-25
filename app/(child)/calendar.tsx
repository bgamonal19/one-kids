import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const { state, addAgenda, removeAgenda } = useFamily();
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(toKey(now.getFullYear(), now.getMonth(), now.getDate()));
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

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

  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const monthLabel = capitalize(cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
  const dayEvents = state.agenda.filter((e) => e.date === selected);
  const [selYear, selMonth, selDay] = selected.split('-').map(Number);
  const selectedLabel = capitalize(new Date(selYear, selMonth - 1, selDay).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  const datesWithEvents = useMemo(
    () => new Set(state.agenda.map((e) => e.date)),
    [state.agenda]
  );

  const submit = async () => {
    if (!title.trim()) return;
    await addAgenda({ title, date: selected, time, note });
    setTitle('');
    setTime('');
    setNote('');
    setShowForm(false);
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>📅 Mi agenda</Text>
      <Text style={styles.sub}>Toca un día para ver o añadir planes.</Text>

      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setCursor(new Date(year, month - 1, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>←</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setCursor(new Date(year, month + 1, 1))} style={styles.navBtn}>
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
          if (d === null) {
            return <View key={i} style={styles.cell} />;
          }
          const key = toKey(year, month, d);
          const isToday =
            d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
          const isSelected = key === selected;
          const hasEvent = datesWithEvents.has(key);
          return (
            <Pressable
              key={i}
              onPress={() => setSelected(key)}
              style={[
                styles.cell,
                isToday && styles.today,
                isSelected && styles.selected,
              ]}
            >
              <Text
                style={[
                  styles.day,
                  (isToday || isSelected) && styles.dayToday,
                ]}
              >
                {d}
              </Text>
              {hasEvent ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.agendaBox}>
        <Text style={styles.agendaTitle}>{selectedLabel}</Text>
        <PrimaryButton
          label={showForm ? 'Cerrar' : '＋ Añadir un plan'}
          variant={showForm ? 'secondary' : 'primary'}
          onPress={() => setShowForm((v) => !v)}
          style={{ marginVertical: 12 }}
        />

        {showForm ? (
          <View style={styles.form}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="¿Qué vas a hacer?"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="Hora (ej. 16:30)"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Nota (opcional)"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
            />
            <PrimaryButton label="Guardar en agenda" onPress={submit} />
          </View>
        ) : null}

        {dayEvents.length === 0 ? (
          <Text style={styles.empty}>🌤️ Día libre. ¡Añade un plan si quieres!</Text>
        ) : (
          dayEvents.map((e) => (
            <View key={e.id} style={styles.event}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>
                  {e.time ? `${e.time} · ` : ''}
                  {e.title}
                </Text>
                {e.note ? <Text style={styles.eventNote}>{e.note}</Text> : null}
              </View>
              <Pressable onPress={() => removeAgenda(e.id)} accessibilityRole="button" accessibilityLabel={`Quitar ${e.title}`} hitSlop={6} style={styles.remove}>
                <Text style={styles.removeIcon}>🗑️</Text>
              </Pressable>
            </View>
          ))
        )}
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
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  week: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  today: { backgroundColor: colors.coralSoft },
  selected: { backgroundColor: colors.coral },
  day: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  dayToday: { color: colors.white },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sun,
    marginTop: 2,
  },
  agendaBox: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 16,
  },
  agendaTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
  },
  form: { gap: 10, marginBottom: 12 },
  input: {
    backgroundColor: colors.mist,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  empty: { fontFamily: fonts.bodySemi, color: colors.inkMuted, fontSize: 17, textAlign: 'center', paddingVertical: 8 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  eventTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  eventNote: { marginTop: 2, fontFamily: fonts.body, color: colors.inkMuted },
  remove: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF1EC', alignItems: 'center', justifyContent: 'center' },
  removeIcon: { fontSize: 20 },
});
