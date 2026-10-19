import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';

const COURSES = [
  {
    id: 'mates',
    title: 'Matemáticas',
    desc: 'Sumas, restas y problemas',
    color: colors.sky,
    href: '/(child)/worlds/numbers' as const,
  },
  {
    id: 'lectura',
    title: 'Lectura',
    desc: 'Palabras y comprensión',
    color: colors.coral,
    href: '/(child)/worlds/letters' as const,
  },
  {
    id: 'ciencias',
    title: 'Ciencias',
    desc: 'Curiosidades del mundo',
    color: colors.leaf,
    href: '/(child)/worlds/explorer' as const,
  },
  {
    id: 'tutor',
    title: 'Con el tutor IA',
    desc: 'Foto de tu tarea y ayuda paso a paso',
    color: '#7B6CF6',
    href: '/(child)/tutor' as const,
  },
];

export default function CoursesScreen() {
  return (
    <Screen scroll>
      <Text style={styles.title}>Cursos</Text>
      <Text style={styles.sub}>Elige un recuadro grande para empezar a aprender.</Text>

      <View style={styles.list}>
        {COURSES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(c.href)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: c.color },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardDesc}>{c.desc}</Text>
          </Pressable>
        ))}
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
  list: { gap: 14 },
  card: {
    minHeight: 120,
    borderRadius: radii.lg,
    padding: 22,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.white,
  },
  cardDesc: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.white,
    opacity: 0.95,
  },
});
