import { PasswordField } from '@/components/PasswordField';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFamily } from '@/lib/store';
import { isNumericPassword } from '@/lib/account-validation';

export default function LoginScreen() {
  const { loginParent, loginChild } = useFamily();
  const [childMode, setChildMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (loading) return;
    if (!email.trim() || !isNumericPassword(password)) {
      setError('Escribe tu usuario o correo y tu clave numérica de 6 a 12 números.');
      return;
    }
    setLoading(true); setError('');
    try {
      const ok = await (childMode ? loginChild(email, password) : loginParent(email, password));
      if (!ok) { setError('Usuario, correo o clave incorrectos.'); return; }
      router.replace('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
  };

  return (
    <Screen scroll>
      <BrandMark size="nav" />
      <Text style={styles.title}>Entrar</Text>
      <View style={styles.form}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PrimaryButton label="Padres" variant={childMode ? 'secondary' : 'primary'} onPress={() => { setChildMode(false); setEmail(''); setPassword(''); setError(''); }} />
          <PrimaryButton label="Hijos" variant={childMode ? 'primary' : 'secondary'} onPress={() => { setChildMode(true); setEmail(''); setPassword(''); setError(''); }} />
        </View>
        {childMode ? <Text style={{ color: colors.ink, fontFamily: fonts.body }}>Usa el usuario y la clave que crearon tus padres. Puedes entrar desde tu propio dispositivo.</Text> : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={childMode ? 'Usuario del niño' : 'Correo'}
          accessibilityLabel={childMode ? 'Usuario del niño' : 'Correo de acceso'}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          keyboardType={childMode ? 'default' : 'email-address'}
          style={styles.input}
        />
        <PasswordField label="Clave numérica de acceso" value={password} onChangeText={setPassword} placeholder="De 6 a 12 números" textContentType="password" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={loading ? "Entrando…" : "Entrar"} onPress={submit} disabled={loading} />
        {childMode ? <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>Si olvidaste tu clave, pide a tus padres que la cambien en «Mis hijos».</Text> : <PrimaryButton label="¿Olvidaste tu clave?" variant="ghost" onPress={() => router.push('/(auth)/forgot')} />}
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
