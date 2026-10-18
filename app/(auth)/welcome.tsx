import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { HeroArt } from '@/components/HeroArt';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useFamily } from '@/lib/store';

export default function WelcomeScreen() {
  const { loadDemo } = useFamily();
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 900;

  const startDemo = async () => {
    setLoading(true);
    try {
      await loadDemo();
      router.replace('/(child)');
    } finally {
      setLoading(false);
    }
  };

  const aiLabel = isSupabaseConfigured
    ? 'Tutor conectado a OpenAI (Vision) vía Supabase'
    : 'Tutor en modo local (sin API). Conecta OpenAI + Supabase para IA real';

  return (
    <Screen wide scroll style={styles.screen}>
      <View style={[styles.grid, desktop && styles.gridDesktop]}>
        <View style={[styles.heroPlane, desktop && styles.heroDesktop]}>
          <HeroArt />
          <View style={styles.heroCopy}>
            <BrandMark
              size="hero"
              subtitle="Plataforma web para aprender con tutor IA, juegos y control parental."
            />
          </View>
        </View>

        <View style={[styles.panel, desktop && styles.panelDesktop]}>
          <Text style={styles.role}>Demo web · ONE KIDS</Text>
          <Text style={styles.aiNote}>{aiLabel}</Text>

          <PrimaryButton
            label={loading ? 'Cargando…' : 'Probar demo ahora'}
            onPress={startDemo}
            disabled={loading}
          />
          <PrimaryButton
            label="Crear cuenta familiar"
            variant="secondary"
            onPress={() => router.push('/(auth)/register')}
          />
          <PrimaryButton
            label="Ya tengo cuenta"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
          <Text style={styles.hint}>PIN de padres en la demo: 1234</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  grid: {
    flexGrow: 1,
    gap: spacing.xl,
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 560,
    gap: 48,
  },
  heroPlane: {
    flex: 1,
    minHeight: 300,
    position: 'relative',
    justifyContent: 'flex-end',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  heroDesktop: {
    minHeight: 520,
    flex: 1.2,
  },
  heroCopy: {
    zIndex: 2,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  panel: {
    gap: 12,
    justifyContent: 'center',
  },
  panelDesktop: {
    flex: 0.85,
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  role: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
    fontSize: 28,
    marginBottom: 4,
  },
  aiNote: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  hint: {
    marginTop: 8,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 13,
  },
});
