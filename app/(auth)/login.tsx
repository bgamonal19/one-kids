import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { NUMERIC_PASSWORD_MAX, isNumericPassword } from '@/lib/account-validation';

export default function LoginScreen() {
  const { loginParent } = useFamily();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (loading) return;
    if (!email.trim() || !isNumericPassword(password)) {
      setError('Escribe tu correo y tu clave numérica, sin letras ni espacios.');
      return;
    }
    setLoading(true); setError('');
    try {
      const ok = await loginParent(email, password);
      if (!ok) { setError('Correo o clave incorrectos.'); return; }
      router.replace('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
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
          accessibilityLabel="Correo de acceso"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Clave numérica"
          accessibilityLabel="Clave numérica de acceso"
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={NUMERIC_PASSWORD_MAX}
          autoCorrect={false}
          autoCapitalize="none"
          textContentType="password"
          placeholderTextColor={colors.inkMuted}
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={loading ? "Entrando…" : "Entrar"} onPress={submit} disabled={loading} />
        <PrimaryButton label="Crear una cuenta" variant="secondary" onPress={() => router.push('/(auth)/register')} />
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
