import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { HeroArt } from '@/components/HeroArt';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function WelcomeScreen() {
  const { loadDemo } = useFamily();
  const [loading, setLoading] = useState(false);

  const startDemo = async () => {
    setLoading(true);
    try {
      await loadDemo();
      router.replace('/(child)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.heroPlane}>
        <HeroArt />
        <View style={styles.heroCopy}>
          <BrandMark
            size="hero"
            subtitle="Tutor IA, mundos para aprender jugando y control parental con modo enfoque."
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Text style={styles.role}>Demo lista para lanzar</Text>
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
        <Text style={styles.hint}>En la demo el PIN parental es 1234</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'space-between' },
  heroPlane: {
    marginTop: spacing.md,
    minHeight: 320,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroCopy: {
    zIndex: 2,
    paddingBottom: spacing.lg,
  },
  actions: { gap: 10, marginBottom: spacing.lg },
  role: {
    fontFamily: fonts.bodySemi,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  hint: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 13,
  },
});
