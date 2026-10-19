import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigMenuTile } from '@/components/BigMenuTile';
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
  const { state, worldsUnlocked } = useFamily();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cols = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const gap = 16;
  const pad = spacing.md;
  const headerH = 70;
  const contentW = width - pad * 2;
  const tileW = (contentW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(TILES.length / cols);
  const usableH = Math.max(480, height - insets.top - insets.bottom - headerH - pad * 2 - 8);
  const tileH = Math.max(150, (usableH - gap * (rows - 1)) / rows);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + pad,
          paddingHorizontal: pad,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>ONE KIDS</Text>
        <Text style={styles.hello}>
          Hola {state.child?.name ?? ''} · toca un recuadro
        </Text>
      </View>

      <View style={[styles.grid, { gap }]}>
        {TILES.map((tile) => {
          const locked = tile.key === 'mundos' && !worldsUnlocked;
          return (
            <View key={tile.key} style={{ width: tileW, height: tileH }}>
              <BigMenuTile
                label={tile.label}
                badge={tile.badge}
                color={tile.color}
                locked={locked}
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    height: 64,
    marginBottom: 8,
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.ink,
  },
  hello: {
    marginTop: 2,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.inkMuted,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
