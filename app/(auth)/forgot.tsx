import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { requestPasswordReset } from '@/lib/cloud-accounts';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try { await requestPasswordReset(supabase, email); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar el enlace.'); }
    finally { setLoading(false); }
  };

  if (sent) return <Screen scroll><BrandMark size="nav" /><Text style={styles.title}>Revisa tu correo</Text><Text style={styles.hint}>Si hay una cuenta con ese correo, te enviamos un enlace para elegir una clave nueva. Ábrelo en este mismo navegador o teléfono.</Text><PrimaryButton label="Ir a entrar" onPress={() => router.replace('/(auth)/login')} /></Screen>;

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Recuperar clave</Text>
      <Text style={styles.hint}>Escribe el correo de tu cuenta y te enviaremos un enlace.</Text>
      <View style={styles.form}>
        <TextInput value={email} onChangeText={setEmail} placeholder="Correo" accessibilityLabel="Correo de la cuenta" placeholderTextColor={colors.inkMuted} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={loading ? 'Enviando…' : 'Enviar enlace'} onPress={submit} disabled={loading} />
        <PrimaryButton label="Volver" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg, marginBottom: spacing.sm, fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink },
  hint: { marginBottom: spacing.lg, fontFamily: fonts.body, color: colors.inkMuted },
  form: { gap: 14 },
  input: { backgroundColor: colors.white, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
