import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PasswordField } from '@/components/PasswordField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/constants/theme';
import { updateAccountPassword } from '@/lib/cloud-accounts';
import { useFamily } from '@/lib/store';
import { supabase } from '@/lib/supabase';

// Outside (auth): the recovery link signs the user in, and (auth) redirects signed-in users away.
export default function ResetPasswordScreen() {
  const { ready, accountMode } = useFamily();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try { await updateAccountPassword(supabase, password, confirmPassword); setPassword(''); setConfirmPassword(''); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar la clave.'); }
    finally { setLoading(false); }
  };

  if (!ready) return <Screen><ActivityIndicator color={colors.coral} size="large" /></Screen>;
  if (done) return <Screen scroll><BrandMark size="nav" /><Text style={styles.title}>Clave cambiada</Text><Text style={styles.hint}>Ya puedes usar tu nueva clave para entrar en otros equipos.</Text><PrimaryButton label="Continuar" onPress={() => router.replace('/')} /></Screen>;
  if (accountMode !== 'cloud') return <Screen scroll><BrandMark size="nav" /><Text style={styles.title}>Enlace no válido</Text><Text style={styles.hint}>El enlace caducó o ya se usó. Pide uno nuevo.</Text><PrimaryButton label="Pedir otro enlace" onPress={() => router.replace('/(auth)/forgot')} /></Screen>;

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Nueva clave</Text>
      <View style={styles.form}>
        <PasswordField label="Nueva clave numérica" value={password} onChangeText={setPassword} placeholder="De 6 a 12 números" textContentType="newPassword" />
        <PasswordField label="Repite la nueva clave" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Vuelve a escribirla" textContentType="newPassword" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={loading ? 'Guardando…' : 'Guardar nueva clave'} onPress={submit} disabled={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg, marginBottom: spacing.sm, fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink },
  hint: { marginBottom: spacing.lg, fontFamily: fonts.body, color: colors.inkMuted },
  form: { gap: 14 },
  error: { fontFamily: fonts.bodySemi, color: colors.coral },
});
