import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigMenuTile } from '@/components/BigMenuTile';
import { KikoMascot } from '@/components/KikoMascot';
import { PlaygroundBg } from '@/components/PlaygroundBg';
import { SpeechBubble } from '@/components/SpeechBubble';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

const TILES = [
  { key: 'inicio', label: 'Inicio', badge: 'IN', color: colors.sky, href: '/(child)' as const },
  { key: 'tareas', label: 'Tareas', badge: 'TA', color: colors.coral, href: '/(child)/tasks' as const },
  { key: 'tutor', label: 'Tutor IA', badge: 'IA', color: '#5B8DEF', href: '/(child)/tutor' as const },
  { key: 'mundos', label: 'Mundos', badge: 'MU', color: colors.leaf, href: '/(child)/worlds' as const },
  {
    key: 'calculadora',
    label: 'Calculadora',
    badge: 'CA',
    color: '#E6A23C',
    href: '/(child)/calculator' as const,
  },
  {
    key: 'calendario',
    label: 'Calendario',
    badge: 'CL',
    color: '#FF7A59',
    href: '/(child)/calendar' as const,
  },
  {
    key: 'cursos',
    label: 'Cursos',
    badge: 'CU',
    color: '#2BB8A8',
    href: '/(child)/courses' as const,
  },
];

export default function ChildHome() {
  const { state, worldsUnlocked, allTasksDone } = useFamily();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cols = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const gap = 14;
  const pad = spacing.md;
  const headerH = 150;
  const contentW = width - pad * 2;
  const tileW = (contentW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(TILES.length / cols);
  const usableH = Math.max(400, height - insets.top - insets.bottom - headerH - pad * 2);
  const tileH = Math.max(136, (usableH - gap * (rows - 1)) / rows);

  const name = state.child?.name ?? 'amigo';
  const mood = allTasksDone ? 'celebrate' : state.focusActive ? 'think' : 'wave';
  const message = allTasksDone
    ? `¡Genial ${name}! Terminaste tus tareas. ¡A jugar en Mundos!`
    : state.focusActive
      ? `Hola ${name}, yo soy Kiko. Primero tus tareas… ¡tú puedes!`
      : `¡Hola ${name}! Toca un recuadro grande para empezar.`;

  return (
    <View style={styles.root}>
      <PlaygroundBg />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 6,
            paddingBottom: insets.bottom + pad,
            paddingHorizontal: pad,
          },
        ]}
      >
        <View style={styles.heroRow}>
          <KikoMascot mood={mood} size={width < 500 ? 100 : 124} />
          <View style={styles.speechWrap}>
            <Text style={styles.brand}>ONE KIDS</Text>
            <SpeechBubble text={message} />
            <Text style={styles.stars}>{state.child?.stars ?? 0} estrellas</Text>
          </View>
        </View>

        <View style={[styles.grid, { gap }]}>
          {TILES.map((tile, i) => {
            const locked = tile.key === 'mundos' && !worldsUnlocked;
            return (
              <View key={tile.key} style={{ width: tileW, height: tileH }}>
                <BigMenuTile
                  label={tile.label}
                  badge={tile.badge}
                  color={tile.color}
                  locked={locked}
                  delay={80 + i * 60}
                  onPress={() => {
                    if (tile.key === 'inicio') return;
                    if (locked) {
                      router.push('/(child)/tasks');
                      return;
                    }
                    router.push(tile.href);
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#BFEFFF' },
  content: { flex: 1, zIndex: 2 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    minHeight: 120,
  },
  speechWrap: { flex: 1, gap: 6 },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.ink,
  },
  stars: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 14,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
