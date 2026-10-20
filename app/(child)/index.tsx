import { router } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigMenuTile } from '@/components/BigMenuTile';
import { KikoMascot } from '@/components/KikoMascot';
import { PlaygroundBg } from '@/components/PlaygroundBg';
import { SpeechBubble } from '@/components/SpeechBubble';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { getAgeProfile } from '@/lib/ages';
import { useFamily } from '@/lib/store';

const TILE_DEFS = [
  { key: 'inicio', badge: 'IN', color: colors.sky, href: '/(child)' as const },
  { key: 'tareas', badge: 'TA', color: colors.coral, href: '/(child)/tasks' as const },
  { key: 'tutor', badge: 'IA', color: '#5B8DEF', href: '/(child)/tutor' as const },
  { key: 'mundos', badge: 'MU', color: colors.leaf, href: '/(child)/worlds' as const },
  { key: 'calculadora', badge: 'CA', color: '#E6A23C', href: '/(child)/calculator' as const },
  { key: 'calendario', badge: 'CL', color: '#FF7A59', href: '/(child)/calendar' as const },
  { key: 'cursos', badge: 'CU', color: '#2BB8A8', href: '/(child)/courses' as const },
] as const;

export default function ChildHome() {
  const { state, worldsUnlocked, allTasksDone } = useFamily();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const age = state.child?.age ?? 8;
  const profile = getAgeProfile(age);

  const cols = Math.min(profile.maxCols, width >= 1000 ? 4 : width >= 700 ? 3 : 2);
  const gap = profile.uiScale > 1.1 ? 12 : 14;
  const pad = spacing.md;
  const headerH = profile.showPlayground ? 158 : 130;
  const contentW = width - pad * 2;
  const tileW = (contentW - gap * (cols - 1)) / cols;
  const rows = Math.ceil(TILE_DEFS.length / cols);
  const usableH = Math.max(380, height - insets.top - insets.bottom - headerH - pad * 2);
  const tileH = Math.max(128 * profile.uiScale, (usableH - gap * (rows - 1)) / rows);

  const name = state.child?.name ?? 'amigo';
  const mood = allTasksDone ? 'celebrate' : state.focusActive ? 'think' : 'wave';
  const message = profile.greeting(name, state.focusActive, allTasksDone);

  return (
    <View style={[styles.root, { backgroundColor: profile.sky }]}>
      {profile.showPlayground ? <PlaygroundBg sky={profile.sky} /> : <View style={styles.teenBg} />}
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
          <KikoMascot mood={mood} size={Math.min(profile.mascotSize, width < 420 ? 96 : profile.mascotSize)} />
          <View style={styles.speechWrap}>
            <Text style={[styles.brand, { fontSize: 22 + profile.uiScale * 4 }]}>ONE KIDS</Text>
            <View style={[styles.badge, { backgroundColor: profile.accent }]}>
              <Text style={styles.badgeText}>{profile.bandTitle}</Text>
            </View>
            <SpeechBubble text={message} scale={profile.uiScale} />
            <Text style={styles.meta}>
              {profile.label} · {state.child?.stars ?? 0} ★
            </Text>
          </View>
        </View>

        <View style={[styles.grid, { gap }]}>
          {TILE_DEFS.map((tile, i) => {
            const locked = tile.key === 'mundos' && !worldsUnlocked;
            const label = profile.tileLabels[tile.key] ?? tile.key;
            return (
              <View key={tile.key} style={{ width: tileW, height: tileH }}>
                <BigMenuTile
                  label={label}
                  badge={tile.badge}
                  color={tile.color}
                  locked={locked}
                  scale={profile.uiScale}
                  delay={70 + i * 55}
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
  root: { flex: 1 },
  teenBg: { ...StyleSheet.absoluteFill, backgroundColor: '#EEF4F7' },
  content: { flex: 1, zIndex: 2 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 110,
  },
  speechWrap: { flex: 1, gap: 6 },
  brand: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 12,
  },
  meta: {
    fontFamily: fonts.bodySemi,
    color: colors.ink,
    fontSize: 13,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
});
