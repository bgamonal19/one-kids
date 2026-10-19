import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { KikoMascot } from '@/components/KikoMascot';
import { PlaygroundBg } from '@/components/PlaygroundBg';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SpeechBubble } from '@/components/SpeechBubble';
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
    ? 'Tutor con OpenAI Vision listo'
    : 'Demo con tutor local · OpenAI se conecta después';

  return (
    <View style={styles.root}>
      <PlaygroundBg />
      <View style={[styles.inner, desktop && styles.innerDesktop]}>
        <View style={[styles.hero, desktop && styles.heroDesktop]}>
          <BrandMark size="hero" subtitle="Aprende jugando con Kiko, tu guía." />
          <View style={styles.mascotRow}>
            <KikoMascot mood="wave" size={desktop ? 180 : 140} />
            <SpeechBubble text="¡Hola! Soy Kiko. Toca el botón naranja y empezamos la aventura." />
          </View>
        </View>

        <View style={[styles.panel, desktop && styles.panelDesktop]}>
          <Text style={styles.role}>¿Listos para aprender?</Text>
          <Text style={styles.aiNote}>{aiLabel}</Text>

          <PrimaryButton
            label={loading ? 'Entrando…' : '¡Empezar a jugar!'}
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
          <Text style={styles.hint}>PIN de padres: 1234</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#BFEFFF' },
  inner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
    zIndex: 2,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  innerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
  },
  hero: { flex: 1, gap: spacing.lg, justifyContent: 'center' },
  heroDesktop: { flex: 1.2 },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.md,
  },
  panel: { gap: 12 },
  panelDesktop: {
    flex: 0.85,
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  role: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
    fontSize: 28,
  },
  aiNote: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  hint: {
    marginTop: 4,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 13,
  },
});
