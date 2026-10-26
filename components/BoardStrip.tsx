import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BoardSheet } from './BoardSheet';
import { blockSegments, dayKey, dayLabel, type Board } from '@/lib/tutor-boards';
import { colors, fonts } from '@/constants/theme';

const COLUMN = 340;

/** A small picture of a whole board: the real board drawn at full size and scaled down. */
function BoardThumb({ board, width, selected, onOpen }: { board: Board; width: number; selected: boolean; onOpen: () => void }) {
  const cols = Math.min(3, Math.max(1, ...board.blocks.flatMap(b => (blockSegments(b) ?? []).map(seg => seg.col + 1))));
  const full = cols * COLUMN;
  const scale = width / (full + 32);
  const day = dayKey(new Date(board.at));
  const time = `${day === dayKey() ? '' : `${dayLabel(day)} · `}${new Date(board.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
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

/** All saved boards in one row above the board, newest first: a full board goes up here when the eraser wipes it. */
export function BoardStrip({ boards, wide, openId, currentId, onOpen }: { boards: Board[]; wide: boolean; openId?: string; currentId?: string; onOpen: (board: Board) => void }) {
  const saved = boards.filter(b => b.id !== currentId).reverse();
  if (!saved.length) return null;
  return (
    <View style={s.strip}>
      <Text style={s.stripHeading}>🧑‍🏫 Mis pizarras · toca una para verla o seguir en ella</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stripRow}>
        {saved.map(b => <BoardThumb key={b.id} board={b} width={wide ? 170 : 128} selected={b.id === openId} onOpen={() => onOpen(b)} />)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  strip: { gap: 6, marginTop: 4 },
  stripHeading: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkMuted },
  stripRow: { gap: 10, paddingVertical: 2 },
  card: { gap: 4, padding: 6, borderRadius: 14, backgroundColor: '#C9D6E2' },
  cardOn: { backgroundColor: colors.sky },
  thumb: { backgroundColor: colors.white, borderRadius: 8, overflow: 'hidden' },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, paddingHorizontal: 4 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted, paddingHorizontal: 4, paddingBottom: 2 },
});
