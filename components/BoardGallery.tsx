import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BoardSheet } from './BoardSheet';
import { dayKey, dayLabel, type Board } from '@/lib/tutor-boards';
import { colors, fonts, radii } from '@/constants/theme';

const COLUMN = 340;

/** A small picture of a whole board: the real board drawn at full size and scaled down. */
function BoardThumb({ board, width, selected, onOpen }: { board: Board; width: number; selected: boolean; onOpen: () => void }) {
  const cols = Math.min(3, Math.max(1, ...board.blocks.map(b => (b.col ?? 0) + 1)));
  const full = cols * COLUMN;
  const scale = width / (full + 32);
  const time = new Date(board.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver la pizarra ${board.topic || 'sin título'}${board.part > 1 ? `, parte ${board.part}` : ''}, de las ${time}`} onPress={onOpen} style={[s.card, { width }, selected && s.cardOn]}>
      <View style={[s.thumb, { height: Math.round(width * 0.62) }]}>
        <View pointerEvents="none" style={{ width: full + 32, padding: 16, transform: [{ scale }], transformOrigin: 'top left' }}>
          <BoardSheet board={board} width={full} cols={cols} lineSize={25} />
        </View>
      </View>
      <Text style={s.title} numberOfLines={1}>{board.topic || 'Pizarra'}{board.part > 1 ? ` · ${board.part}` : ''}</Text>
      <Text style={s.time}>{time} · {board.blocks.filter(b => b.reply).length} {board.blocks.filter(b => b.reply).length === 1 ? 'explicación' : 'explicaciones'}</Text>
    </Pressable>
  );
}

/** The day's boards, newest first, instead of a list of conversations. */
export function BoardGallery({ boards, width, openId, onOpen }: { boards: Board[]; width: number; openId?: string; onOpen: (board: Board) => void }) {
  const days = [...new Set(boards.map(b => dayKey(new Date(b.at))))].sort().reverse();
  const [day, setDay] = useState(days[0] ?? dayKey());
  const shownDay = days.includes(day) ? day : days[0];
  const perRow = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const thumb = Math.floor((width - (perRow - 1) * 12) / perRow);
  if (!days.length) return null;
  return (
    <View style={s.gallery}>
      <Text style={s.heading}>🧑‍🏫 Mis pizarras</Text>
      <View style={s.days} accessibilityRole="tablist">
        {days.map(d => <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected: d === shownDay }} onPress={() => setDay(d)} style={[s.day, d === shownDay && s.dayOn]}>
          <Text style={[s.dayText, d === shownDay && s.dayTextOn]}>{dayLabel(d)} · {boards.filter(b => dayKey(new Date(b.at)) === d).length}</Text>
        </Pressable>)}
      </View>
      <View style={s.grid}>
        {boards.filter(b => dayKey(new Date(b.at)) === shownDay).reverse().map(b => <BoardThumb key={b.id} board={b} width={thumb} selected={b.id === openId} onOpen={() => onOpen(b)} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  gallery: { gap: 12 },
  heading: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#CDDCE9' },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  dayTextOn: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { gap: 4, padding: 6, borderRadius: 14, backgroundColor: '#C9D6E2' },
  cardOn: { backgroundColor: colors.sky },
  thumb: { backgroundColor: colors.white, borderRadius: 8, overflow: 'hidden' },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, paddingHorizontal: 4 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, paddingHorizontal: 4, paddingBottom: 2 },
});
