import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';

export default function LoginScreen() {
  const { loginParent, state } = useFamily();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!state.parent) {
      setError('Aún no hay una cuenta. Crea una primero.');
      return;
    }
    const ok = await loginParent(email, password);
    if (!ok) {
      setError('Correo o clave incorrectos.');
      return;
    }
    if (!state.onboarded) router.replace('/(onboarding)/pin');
    else router.replace('/(child)');
  };

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Entrar</Text>
      <View style={styles.form}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Clave"
          placeholderTextColor={colors.inkMuted}
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Entrar" onPress={submit} />
        <PrimaryButton label="Volver" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.ink,
  },
  form: { gap: 14 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
